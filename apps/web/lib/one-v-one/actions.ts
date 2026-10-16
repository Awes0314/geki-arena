"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, failInternal, formDataToValues, ok, type FormState } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { checkUserRatingCondition, validateRatingRange } from "@/lib/competition/rating-condition";
import { recordActivity } from "@/lib/logging/activity-log";
import { countChartsInRange, isChartSelectable, pickRandomChartId } from "@/lib/one-v-one/charts";
import { isMusicRangeType, type MusicRange } from "@/lib/one-v-one/music-range";
import { computeEndAt, getMatchStatus, type StoredMatchStatus } from "@/lib/one-v-one/status";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOneVOneForm } from "@/lib/validation/one-v-one";

const uuid = z.string().uuid();

function revalidateMatch(matchId: string) {
  revalidatePath("/one-v-one");
  revalidatePath(`/one-v-one/${matchId}`);
}

/** 1v1対戦を作成し、成功時は詳細へ遷移する。対戦相手を指定した場合は承認待ち、指定なしは募集中になる。 */
export async function createMatch(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const user = await getCurrentUser();
  if (!user) return { result: fail("UNAUTHENTICATED", "ログインが必要です"), values };

  const validationFail = (fieldErrors: Record<string, string>): FormState => ({
    result: fail("VALIDATION_ERROR", "入力内容を確認してください", fieldErrors),
    values,
  });
  const parsed = parseOneVOneForm(values);
  if (!parsed.ok) return validationFail(parsed.fieldErrors);
  const input = parsed.data;

  let matchId: string;
  try {
    if (!(await isChartSelectable(input.creatorChartId, input.range))) {
      return validationFail({ creatorChartId: "自選楽曲は指定した楽曲範囲内の有効な譜面を選択してください" });
    }

    const admin = createAdminClient();
    if (input.opponentUserId) {
      if (input.opponentUserId === user.id) return validationFail({ opponentUserId: "自分自身は指定できません" });
      const { data: opponent, error } = await admin
        .from("users")
        .select("id")
        .eq("id", input.opponentUserId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw new Error(`failed to fetch opponent: ${error.message}`);
      if (!opponent) return validationFail({ opponentUserId: "対戦相手が見つかりません" });
    }

    const ratingErrors = await validateRatingRange({ minId: input.ratingMinId, maxId: input.ratingMaxId });
    if (ratingErrors) return validationFail(ratingErrors);

    // 募集範囲に自分自身も含まれること（Rating区分未設定は不可）
    const ownCondition = await checkUserRatingCondition(user.id, { minId: input.ratingMinId, maxId: input.ratingMaxId });
    if (!ownCondition.ok) return validationFail({ ratingMinId: ownCondition.reason });

    // 成立時にランダム楽曲を選べるよう、候補が1曲以上あることを確認する（自選曲は候補から除く）
    if ((await countChartsInRange(input.range, [input.creatorChartId])) === 0) {
      return validationFail({ rangeMin: "この範囲には選択できる楽曲がありません" });
    }

    const { data: created, error: insertError } = await admin
      .from("one_v_one_matches")
      .insert({
        creator_id: user.id,
        creator_chart_id: input.creatorChartId,
        // 相手選択楽曲範囲とランダム楽曲範囲は同一の範囲を使う
        opponent_range_type: input.range.type,
        opponent_range_min: input.range.min,
        opponent_range_max: input.range.max,
        random_range_type: input.range.type,
        random_range_min: input.range.min,
        random_range_max: input.range.max,
        opponent_user_id: input.opponentUserId,
        recruiting_rating_min_id: input.ratingMinId,
        recruiting_rating_max_id: input.ratingMaxId,
        status: input.opponentUserId ? "pending_acceptance" : "recruiting",
      })
      .select("id")
      .single();
    if (insertError) throw new Error(`failed to insert match: ${insertError.message}`);
    matchId = created.id;
    await recordActivity({ eventType: "one_v_one_create", userId: user.id, detail: { matchId } });
  } catch (cause) {
    return { result: failInternal("createMatch", cause), values };
  }

  revalidatePath("/one-v-one");
  redirect(`/one-v-one/${matchId}`);
}

/** 募集中の対戦への挑戦、または承認待ちの対戦の承認を確定する。確定時に対戦が成立し、ランダム楽曲が決定される。 */
export async function joinMatch(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const matchId = values.matchId ?? "";
  const user = await getCurrentUser();
  if (!user) return { result: fail("UNAUTHENTICATED", "ログインが必要です"), values };

  const chartId = values.opponentChartId ?? "";
  if (!uuid.safeParse(matchId).success) return { result: fail("NOT_FOUND", "対戦が見つかりません"), values };
  if (!uuid.safeParse(chartId).success) {
    return { result: fail("VALIDATION_ERROR", "入力内容を確認してください", { opponentChartId: "楽曲を選択してください" }), values };
  }

  try {
    const admin = createAdminClient();
    const { data: match, error } = await admin
      .from("one_v_one_matches")
      .select("*")
      .eq("id", matchId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`failed to fetch match: ${error.message}`);
    if (!match) return { result: fail("NOT_FOUND", "対戦が見つかりません"), values };

    const status = getMatchStatus(
      { status: match.status as StoredMatchStatus, createdAt: match.created_at, endAt: match.end_at },
      new Date(),
    );
    if (status === "expired") return { result: fail("CONFLICT", "募集の期限が切れています"), values };
    if (status !== "recruiting" && status !== "pending_acceptance") {
      return { result: fail("CONFLICT", "この対戦はすでに成立しています"), values };
    }
    if (match.creator_id === user.id) {
      return { result: fail("FORBIDDEN", "自分が作成した対戦には参加できません"), values };
    }
    if (status === "pending_acceptance" && match.opponent_user_id !== user.id) {
      return { result: fail("FORBIDDEN", "対戦相手として指定されたユーザーのみ承認できます"), values };
    }
    if (status === "recruiting") {
      const condition = await checkUserRatingCondition(user.id, {
        minId: match.recruiting_rating_min_id,
        maxId: match.recruiting_rating_max_id,
      });
      if (!condition.ok) return { result: fail("FORBIDDEN", condition.reason), values };
    }

    if (!isMusicRangeType(match.random_range_type)) throw new Error(`invalid range type: ${match.random_range_type}`);
    const range: MusicRange = {
      type: match.random_range_type,
      min: Number(match.random_range_min),
      max: Number(match.random_range_max),
    };
    if (chartId === match.creator_chart_id) {
      return {
        result: fail("VALIDATION_ERROR", "入力内容を確認してください", {
          opponentChartId: "作成者の自選楽曲と同じ譜面は選択できません",
        }),
        values,
      };
    }
    if (!(await isChartSelectable(chartId, range))) {
      return {
        result: fail("VALIDATION_ERROR", "入力内容を確認してください", {
          opponentChartId: "指定された範囲内の譜面を選択してください",
        }),
        values,
      };
    }

    const randomChartId = await pickRandomChartId(range, [match.creator_chart_id, chartId]);
    if (!randomChartId) return { result: fail("CONFLICT", "ランダム楽曲の候補がないため成立できません"), values };

    const startAt = new Date();
    // 同時に確定された場合は、先に更新できた1件のみを成立させる
    const { data: updated, error: updateError } = await admin
      .from("one_v_one_matches")
      .update({
        status: "established",
        opponent_user_id: user.id,
        opponent_selected_chart_id: chartId,
        random_selected_chart_id: randomChartId,
        start_at: startAt.toISOString(),
        end_at: computeEndAt(startAt).toISOString(),
      })
      .eq("id", matchId)
      .eq("status", match.status)
      .is("deleted_at", null)
      .select("id");
    if (updateError) throw new Error(`failed to establish match: ${updateError.message}`);
    if (updated.length === 0) return { result: fail("CONFLICT", "この対戦はすでに成立しています"), values };
  } catch (cause) {
    return { result: failInternal("joinMatch", cause), values };
  }

  revalidateMatch(matchId);
  return { result: ok(), values };
}

/** 対戦を削除する（作成者のみ。成立前に限る）。 */
export async function deleteMatch(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const matchId = values.matchId ?? "";
  const user = await getCurrentUser();
  if (!user) return { result: fail("UNAUTHENTICATED", "ログインが必要です"), values };
  if (!uuid.safeParse(matchId).success) return { result: fail("NOT_FOUND", "対戦が見つかりません"), values };

  try {
    const admin = createAdminClient();
    const { data: match, error } = await admin
      .from("one_v_one_matches")
      .select("creator_id, status")
      .eq("id", matchId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`failed to fetch match: ${error.message}`);
    if (!match) return { result: fail("NOT_FOUND", "対戦が見つかりません"), values };
    if (match.creator_id !== user.id) return { result: fail("FORBIDDEN", "作成者のみ削除できます"), values };

    const { data: deleted, error: deleteError } = await admin
      .from("one_v_one_matches")
      .update({ status: "deleted", deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", matchId)
      .in("status", ["recruiting", "pending_acceptance"])
      .is("deleted_at", null)
      .select("id");
    if (deleteError) throw new Error(`failed to delete match: ${deleteError.message}`);
    if (deleted.length === 0) return { result: fail("CONFLICT", "成立後の対戦は削除できません"), values };
  } catch (cause) {
    return { result: failInternal("deleteMatch", cause), values };
  }

  revalidatePath("/one-v-one");
  redirect("/one-v-one");
}
