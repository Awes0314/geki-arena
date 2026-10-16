"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, failInternal, formDataToValues, ok, type FormState } from "@/lib/actions/result";
import { getAdminUser } from "@/lib/admin/guard";
import { recordOperation } from "@/lib/logging/operation-log";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = z.string().uuid();
/** Supabase Authのban_durationで実質無期限とする */
const BAN_FOREVER = "876000h";

function revalidateUser(userNo: number | null) {
  revalidatePath("/admin/users");
  if (userNo !== null) revalidatePath(`/admin/users/${userNo}`);
}

async function changeUserStatus(formData: FormData, to: "suspended" | "active"): Promise<FormState> {
  const values = formDataToValues(formData);
  const operator = await getAdminUser();
  if (!operator) return { result: fail("FORBIDDEN", "権限がありません"), values };

  const parsedId = uuid.safeParse(values.userId);
  if (!parsedId.success) return { result: fail("VALIDATION_ERROR", "対象ユーザーが不正です"), values };
  const targetId = parsedId.data;
  if (targetId === operator.id) return { result: fail("CONFLICT", "自分自身は操作できません"), values };

  try {
    const admin = createAdminClient();
    const { data: target, error } = await admin
      .from("users")
      .select("id, user_no, role, status")
      .eq("id", targetId)
      .maybeSingle();
    if (error) throw new Error(`failed to fetch user: ${error.message}`);
    if (!target) return { result: fail("NOT_FOUND", "ユーザーが見つかりません"), values };
    if (target.role === "admin") return { result: fail("FORBIDDEN", "運営ユーザーは操作できません"), values };

    const from = to === "suspended" ? "active" : "suspended";
    if (target.status !== from) {
      const message = to === "suspended" ? "停止できるのは有効なアカウントのみです" : "停止中のアカウントのみ解除できます";
      return { result: fail("CONFLICT", message), values };
    }

    const { error: updateError } = await admin.from("users").update({ status: to }).eq("id", targetId);
    if (updateError) throw new Error(`failed to update status: ${updateError.message}`);

    // 停止時は既存セッションの更新も不可にする
    const { error: banError } = await admin.auth.admin.updateUserById(targetId, {
      ban_duration: to === "suspended" ? BAN_FOREVER : "none",
    });
    if (banError) throw new Error(`failed to update auth ban: ${banError.message}`);

    await recordOperation({
      operatorId: operator.id,
      actionType: to === "suspended" ? "user_suspend" : "user_unsuspend",
      targetType: "user",
      targetId,
      detail: { userNo: target.user_no },
    });
    revalidateUser(target.user_no);
  } catch (cause) {
    return { result: failInternal(to === "suspended" ? "suspendUser" : "unsuspendUser", cause), values };
  }
  return { result: ok(), values };
}

/** アカウントを停止する（運営のみ）。 */
export async function suspendUser(_prevState: FormState, formData: FormData): Promise<FormState> {
  return changeUserStatus(formData, "suspended");
}

/** アカウントの停止を解除する（運営のみ）。 */
export async function unsuspendUser(_prevState: FormState, formData: FormData): Promise<FormState> {
  return changeUserStatus(formData, "active");
}

/** 通報を対応済みにする（運営のみ）。 */
export async function resolveReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const operator = await getAdminUser();
  if (!operator) return { result: fail("FORBIDDEN", "権限がありません"), values };

  const parsedId = uuid.safeParse(values.reportId);
  if (!parsedId.success) return { result: fail("VALIDATION_ERROR", "対象の通報が不正です"), values };

  try {
    const { data, error } = await createAdminClient()
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", parsedId.data)
      .eq("status", "open")
      .select("id, reported_user_id");
    if (error) throw new Error(`failed to resolve report: ${error.message}`);
    if (data.length === 0) return { result: fail("CONFLICT", "未対応の通報ではありません"), values };

    await recordOperation({
      operatorId: operator.id,
      actionType: "report_resolve",
      targetType: "report",
      targetId: parsedId.data,
      detail: { reportedUserId: data[0].reported_user_id },
    });
    revalidateUser(null);
  } catch (cause) {
    return { result: failInternal("resolveReport", cause), values };
  }
  return { result: ok(), values };
}
