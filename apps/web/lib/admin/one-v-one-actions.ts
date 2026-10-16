"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, failInternal, formDataToValues, ok, type FormState } from "@/lib/actions/result";
import { getAdminUser } from "@/lib/admin/guard";
import { recordOperation } from "@/lib/logging/operation-log";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = z.string().uuid();

/** 1v1対戦を状態によらず論理削除する（運営のみ）。 */
export async function adminDeleteMatch(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const operator = await getAdminUser();
  if (!operator) return { result: fail("FORBIDDEN", "権限がありません"), values };

  const parsedId = uuid.safeParse(values.matchId);
  if (!parsedId.success) return { result: fail("VALIDATION_ERROR", "対象の対戦が不正です"), values };
  const matchId = parsedId.data;

  try {
    const { data, error } = await createAdminClient()
      .from("one_v_one_matches")
      .update({ status: "deleted", deleted_at: new Date().toISOString(), deleted_by: operator.id })
      .eq("id", matchId)
      .is("deleted_at", null)
      .select("id, status");
    if (error) throw new Error(`failed to delete match: ${error.message}`);
    if (data.length === 0) return { result: fail("NOT_FOUND", "削除できる対戦が見つかりません"), values };

    await recordOperation({
      operatorId: operator.id,
      actionType: "one_v_one_delete",
      targetType: "one_v_one_match",
      targetId: matchId,
    });
    revalidatePath("/admin/one-v-one");
    revalidatePath(`/admin/one-v-one/${matchId}`);
    revalidatePath("/one-v-one");
    revalidatePath(`/one-v-one/${matchId}`);
  } catch (cause) {
    return { result: failInternal("adminDeleteMatch", cause), values };
  }
  return { result: ok(), values };
}
