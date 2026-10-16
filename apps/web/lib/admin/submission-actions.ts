"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, failInternal, formDataToValues, ok, type FormState } from "@/lib/actions/result";
import { getAdminUser } from "@/lib/admin/guard";
import { computeParticipantScore } from "@/lib/competition/ranking";
import { recordOperation } from "@/lib/logging/operation-log";
import { fetchValidSubmissions } from "@/lib/score-submission/queries";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = z.string().uuid();

type DeletingSubmission = { id: string; submitter_id: string; context_type: string; context_id: string };

/** 削除対象の提出を除いた提出から、ベスト記録などの参照先を再計算して更新する。 */
async function recalculateReferences(target: DeletingSubmission): Promise<void> {
  const admin = createAdminClient();
  const { context_type: contextType, context_id: contextId, submitter_id: submitterId } = target;

  if (contextType === "course") {
    const { error } = await admin
      .from("course_challenge_results")
      .delete()
      .eq("course_id", contextId)
      .eq("user_id", submitterId)
      .eq("latest_submission_id", target.id);
    if (error) throw new Error(`failed to clear course result: ${error.message}`);
    return;
  }

  const remaining = (
    await fetchValidSubmissions({ contextType: contextType as "competition" | "one_v_one", contextId, userIds: [submitterId] })
  ).filter((submission) => submission.id !== target.id);

  if (contextType === "competition") {
    const { data: competition, error } = await admin
      .from("competitions")
      .select("continuous_play_required")
      .eq("id", contextId)
      .maybeSingle();
    if (error) throw new Error(`failed to fetch competition: ${error.message}`);
    if (!competition) return;

    const after = computeParticipantScore(remaining, competition.continuous_play_required);
    const { error: updateError } = await admin
      .from("competition_participants")
      .update({ best_submission_id: after?.submissionId ?? null })
      .eq("competition_id", contextId)
      .eq("user_id", submitterId);
    if (updateError) throw new Error(`failed to update best submission: ${updateError.message}`);
    return;
  }

  const { data: match, error } = await admin
    .from("one_v_one_matches")
    .select("creator_id, opponent_user_id")
    .eq("id", contextId)
    .maybeSingle();
  if (error) throw new Error(`failed to fetch match: ${error.message}`);
  if (!match) return;

  const after = computeParticipantScore(remaining, true);
  const submissionId = after?.submissionId ?? null;
  const column =
    match.creator_id === submitterId
      ? { creator_submission_id: submissionId }
      : match.opponent_user_id === submitterId
        ? { opponent_submission_id: submissionId }
        : null;
  if (!column) return;
  const { error: updateError } = await admin.from("one_v_one_matches").update(column).eq("id", contextId);
  if (updateError) throw new Error(`failed to update match submission: ${updateError.message}`);
}

/** 提出を削除し、参照している大会ベスト・1v1スコア・コース結果を再計算する（運営のみ）。 */
export async function adminDeleteSubmission(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const operator = await getAdminUser();
  if (!operator) return { result: fail("FORBIDDEN", "権限がありません"), values };

  const parsedId = uuid.safeParse(values.submissionId);
  if (!parsedId.success) return { result: fail("VALIDATION_ERROR", "対象の提出が不正です"), values };

  try {
    const admin = createAdminClient();
    const { data: target, error } = await admin
      .from("score_submissions")
      .select("id, submitter_id, context_type, context_id, total_score")
      .eq("id", parsedId.data)
      .maybeSingle();
    if (error) throw new Error(`failed to fetch submission: ${error.message}`);
    if (!target) return { result: fail("NOT_FOUND", "提出が見つかりません"), values };

    await recalculateReferences(target);

    const { error: songError } = await admin.from("song_scores").delete().eq("submission_id", target.id);
    if (songError) throw new Error(`failed to delete song scores: ${songError.message}`);
    const { error: deleteError } = await admin.from("score_submissions").delete().eq("id", target.id);
    if (deleteError) throw new Error(`failed to delete submission: ${deleteError.message}`);

    await recordOperation({
      operatorId: operator.id,
      actionType: "score_delete",
      targetType: "score_submission",
      targetId: target.id,
      detail: {
        contextType: target.context_type,
        contextId: target.context_id,
        submitterId: target.submitter_id,
        totalScore: target.total_score,
      },
    });
    revalidatePath("/admin/submissions");
    if (target.context_type === "competition") revalidatePath(`/competitions/${target.context_id}`);
    if (target.context_type === "one_v_one") revalidatePath(`/one-v-one/${target.context_id}`);
  } catch (cause) {
    return { result: failInternal("adminDeleteSubmission", cause), values };
  }
  return { result: ok(), values };
}
