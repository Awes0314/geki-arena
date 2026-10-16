"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, failInternal, formDataToValues, ok, type FormState } from "@/lib/actions/result";
import { getAdminUser } from "@/lib/admin/guard";
import { recordOperation } from "@/lib/logging/operation-log";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = z.string().uuid();

function revalidateCompetition(competitionId: string) {
  revalidatePath("/admin/competitions");
  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/competitions");
  revalidatePath(`/competitions/${competitionId}`);
}

/** 大会を条件によらず論理削除する（運営のみ）。 */
export async function adminDeleteCompetition(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const operator = await getAdminUser();
  if (!operator) return { result: fail("FORBIDDEN", "権限がありません"), values };

  const parsedId = uuid.safeParse(values.competitionId);
  if (!parsedId.success) return { result: fail("VALIDATION_ERROR", "対象の大会が不正です"), values };
  const competitionId = parsedId.data;

  try {
    const { data, error } = await createAdminClient()
      .from("competitions")
      .update({ deleted_at: new Date().toISOString(), deleted_by: operator.id })
      .eq("id", competitionId)
      .is("deleted_at", null)
      .select("id, name");
    if (error) throw new Error(`failed to delete competition: ${error.message}`);
    if (data.length === 0) return { result: fail("NOT_FOUND", "削除できる大会が見つかりません"), values };

    await recordOperation({
      operatorId: operator.id,
      actionType: "competition_delete",
      targetType: "competition",
      targetId: competitionId,
      detail: { name: data[0].name },
    });
    revalidateCompetition(competitionId);
  } catch (cause) {
    return { result: failInternal("adminDeleteCompetition", cause), values };
  }
  return { result: ok(), values };
}

/** 参加者の参加を条件によらず取り消す（運営のみ）。 */
export async function adminRemoveParticipant(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const operator = await getAdminUser();
  if (!operator) return { result: fail("FORBIDDEN", "権限がありません"), values };

  const parsedCompetition = uuid.safeParse(values.competitionId);
  const parsedUser = uuid.safeParse(values.userId);
  if (!parsedCompetition.success || !parsedUser.success) {
    return { result: fail("VALIDATION_ERROR", "対象が不正です"), values };
  }

  try {
    const { data, error } = await createAdminClient()
      .from("competition_participants")
      .update({ removed_at: new Date().toISOString(), removed_by: operator.id })
      .eq("competition_id", parsedCompetition.data)
      .eq("user_id", parsedUser.data)
      .is("removed_at", null)
      .select("user_id");
    if (error) throw new Error(`failed to remove participant: ${error.message}`);
    if (data.length === 0) return { result: fail("NOT_FOUND", "対象の参加者が見つかりません"), values };

    await recordOperation({
      operatorId: operator.id,
      actionType: "participant_remove",
      targetType: "competition",
      targetId: parsedCompetition.data,
      detail: { userId: parsedUser.data },
    });
    revalidateCompetition(parsedCompetition.data);
  } catch (cause) {
    return { result: failInternal("adminRemoveParticipant", cause), values };
  }
  return { result: ok(), values };
}
