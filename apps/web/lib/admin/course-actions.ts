"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, failInternal, formDataToValues, ok, type FormState } from "@/lib/actions/result";
import { getAdminUser } from "@/lib/admin/guard";
import { METRIC_KEYS } from "@/lib/course-condition";
import { recordOperation } from "@/lib/logging/operation-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCourseForm, type CourseInput, type PerChartInputs } from "@/lib/validation/course";

const uuid = z.string().uuid();
const HAS_RESULTS_MESSAGE = "挑戦結果があるため、譜面構成は変更・削除できません";

function revalidateCourses(courseId?: string) {
  revalidatePath("/admin/courses");
  if (courseId) revalidatePath(`/admin/courses/${courseId}`);
}

function parseForm(formData: FormData, values: Record<string, string>) {
  const perChartInputs: PerChartInputs = {};
  for (const key of METRIC_KEYS) perChartInputs[key] = formData.getAll(`perChart_${key}`).map(String);
  return parseCourseForm(values, perChartInputs);
}

/** 指定した譜面がすべて有効か確認する。 */
async function allChartsActive(chartIds: string[]): Promise<boolean> {
  const { data, error } = await createAdminClient().from("charts").select("id").eq("is_active", true).in("id", chartIds);
  if (error) throw new Error(`failed to fetch charts: ${error.message}`);
  return data.length === chartIds.length;
}

function rpcArgs(input: CourseInput) {
  return {
    p_course_name: input.courseName,
    p_chapter: input.chapter,
    p_badge_chapter: input.badgeChapter,
    p_clear_condition: input.clearCondition,
    p_chart_ids: input.chartIds,
  };
}

/** コースを作成し、成功時は詳細ページへ遷移する（運営のみ）。 */
export async function createCourse(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const operator = await getAdminUser();
  if (!operator) return { result: fail("FORBIDDEN", "権限がありません"), values };

  const parsed = parseForm(formData, values);
  if (!parsed.ok) return { result: fail("VALIDATION_ERROR", "入力内容を確認してください", parsed.fieldErrors), values };

  let courseId: string;
  try {
    if (!(await allChartsActive(parsed.data.chartIds))) {
      return { result: fail("VALIDATION_ERROR", "入力内容を確認してください", { chartIds: "選択できない譜面が含まれています" }), values };
    }
    const { data, error } = await createAdminClient().rpc("admin_create_course", rpcArgs(parsed.data));
    if (error) throw new Error(`failed to create course: ${error.message}`);
    courseId = data;

    await recordOperation({
      operatorId: operator.id,
      actionType: "course_create",
      targetType: "course",
      targetId: courseId,
      detail: { courseName: parsed.data.courseName, chapter: parsed.data.chapter },
    });
  } catch (cause) {
    return { result: failInternal("createCourse", cause), values };
  }

  revalidateCourses();
  redirect(`/admin/courses/${courseId}`);
}

/** コースを更新する（運営のみ）。挑戦結果があるコースの譜面構成は変更できない。 */
export async function updateCourse(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const operator = await getAdminUser();
  if (!operator) return { result: fail("FORBIDDEN", "権限がありません"), values };

  const parsedId = uuid.safeParse(values.courseId);
  if (!parsedId.success) return { result: fail("VALIDATION_ERROR", "対象のコースが不正です"), values };
  const courseId = parsedId.data;

  const parsed = parseForm(formData, values);
  if (!parsed.ok) return { result: fail("VALIDATION_ERROR", "入力内容を確認してください", parsed.fieldErrors), values };

  try {
    if (!(await allChartsActive(parsed.data.chartIds))) {
      return { result: fail("VALIDATION_ERROR", "入力内容を確認してください", { chartIds: "選択できない譜面が含まれています" }), values };
    }
    const { error } = await createAdminClient().rpc("admin_update_course", { p_course_id: courseId, ...rpcArgs(parsed.data) });
    if (error?.message.includes("course_not_found")) return { result: fail("NOT_FOUND", "コースが見つかりません"), values };
    if (error?.message.includes("course_has_results")) return { result: fail("CONFLICT", HAS_RESULTS_MESSAGE), values };
    if (error) throw new Error(`failed to update course: ${error.message}`);

    await recordOperation({
      operatorId: operator.id,
      actionType: "course_update",
      targetType: "course",
      targetId: courseId,
      detail: { courseName: parsed.data.courseName, chapter: parsed.data.chapter },
    });
    revalidateCourses(courseId);
  } catch (cause) {
    return { result: failInternal("updateCourse", cause), values };
  }
  return { result: ok(), values };
}

/** 挑戦結果がないコースを削除し、一覧へ遷移する（運営のみ）。 */
export async function deleteCourse(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const operator = await getAdminUser();
  if (!operator) return { result: fail("FORBIDDEN", "権限がありません"), values };

  const parsedId = uuid.safeParse(values.courseId);
  if (!parsedId.success) return { result: fail("VALIDATION_ERROR", "対象のコースが不正です"), values };

  try {
    const { error } = await createAdminClient().rpc("admin_delete_course", { p_course_id: parsedId.data });
    if (error?.message.includes("course_not_found")) return { result: fail("NOT_FOUND", "コースが見つかりません"), values };
    if (error?.message.includes("course_has_results")) return { result: fail("CONFLICT", HAS_RESULTS_MESSAGE), values };
    if (error) throw new Error(`failed to delete course: ${error.message}`);

    await recordOperation({
      operatorId: operator.id,
      actionType: "course_delete",
      targetType: "course",
      targetId: parsedId.data,
    });
  } catch (cause) {
    return { result: failInternal("deleteCourse", cause), values };
  }

  revalidateCourses();
  redirect("/admin/courses");
}
