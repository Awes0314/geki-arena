"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, failInternal, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { computeParticipantScore } from "@/lib/competition/ranking";
import { selectContinuousPlays } from "@/lib/competition/selection";
import { getMatchDetail, listMatches, type OneVOneDetail } from "@/lib/one-v-one/queries";
import { matchPlaysToCharts } from "@/lib/score-submission/chart-candidates";
import { isDuplicatePlay } from "@/lib/score-submission/duplicates";
import { insertScoreSubmission } from "@/lib/score-submission/persist";
import { fetchValidSubmissions } from "@/lib/score-submission/queries";
import { parseBookmarkletPayload } from "@/lib/score-submission/schema";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmittableMatch = { id: string; label: string; endAt: string };

export type MatchSubmissionPreview = {
  targets: Array<{ chartId: string; title: string; difficulty: string; level: string }>;
  /** 提出候補（課題曲順のプレイidx）。連続プレイが見つからない場合はnull */
  continuousIdx: string[] | null;
};

export type MatchSubmissionResult = {
  matchId: string;
  totalScore: number;
  /** 既存の記録を更新したか */
  improved: boolean;
  submittedCount: number;
};

const uuid = z.string().uuid();

type Context = {
  match: OneVOneDetail;
  targetIds: string[];
  period: { startAt: Date; endAt: Date };
};

/** 対戦中で、自身が参加者であることを確認し、提出に必要な情報を返す。 */
async function loadContext(userId: string, matchId: string): Promise<ActionResult<Context>> {
  if (!uuid.safeParse(matchId).success) return fail("VALIDATION_ERROR", "対戦の指定が不正です。");

  const match = await getMatchDetail(matchId, userId);
  if (!match) return fail("NOT_FOUND", "対戦が見つかりません。");
  if (match.status !== "established") return fail("CONFLICT", "対戦中の1v1にのみ提出できます。");
  if (!match.isCreator && !match.isOpponent) return fail("FORBIDDEN", "この対戦の参加者ではないため提出できません。");

  const { creatorChart, opponentChart, randomChart, startAt, endAt } = match;
  if (!creatorChart || !opponentChart || !randomChart || !startAt || !endAt) {
    throw new Error(`established match ${matchId} is missing charts or period`);
  }
  return ok({
    match,
    targetIds: [creatorChart.chartId, opponentChart.chartId, randomChart.chartId],
    period: { startAt: new Date(startAt), endAt: new Date(endAt) },
  });
}

/** 提出可能な1v1（自身が参加している対戦中のもの）の一覧。 */
export async function getSubmittableMatches(): Promise<ActionResult<SubmittableMatch[]>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  try {
    const matches = await listMatches({ tab: "mine", viewerId: user.id });
    return ok(
      matches
        .filter((match) => match.status === "established" && match.endAt !== null)
        .map((match) => ({
          id: match.id,
          label: `${match.creator?.displayName ?? "不明"} vs ${match.opponent?.displayName ?? "不明"}`,
          endAt: match.endAt as string,
        })),
    );
  } catch (cause) {
    return failInternal("getSubmittableMatches", cause);
  }
}

/** 受信したプレイ履歴から、選択した1v1への提出候補（3曲連続プレイ）を算出する。 */
export async function prepareMatchSubmission(input: {
  payload: unknown;
  matchId: string;
}): Promise<ActionResult<MatchSubmissionPreview>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const payload = parseBookmarkletPayload(input.payload);
  if (!payload || payload.mode !== "tournament") return fail("VALIDATION_ERROR", "送信データの形式が不正です。");

  try {
    const context = await loadContext(user.id, input.matchId);
    if (!context.ok) return context;
    const { match, targetIds, period } = context.data;

    const matched = await matchPlaysToCharts(payload.plays);
    const continuous = selectContinuousPlays(matched, targetIds, period);

    return ok({
      targets: [match.creatorChart, match.opponentChart, match.randomChart].flatMap((chart) =>
        chart ? [{ chartId: chart.chartId, title: chart.title, difficulty: chart.difficulty, level: chart.level }] : [],
      ),
      continuousIdx: continuous
        ? [...continuous]
            .sort((a, b) => targetIds.indexOf(a.chartId as string) - targetIds.indexOf(b.chartId as string))
            .map((entry) => entry.play.idx)
        : null,
    });
  } catch (cause) {
    return failInternal("prepareMatchSubmission", cause);
  }
}

const submitSchema = z.object({ payload: z.unknown(), matchId: z.string() });

/** 3曲連続プレイを1v1へ提出する。合計スコアが既存の記録を上回る場合のみ対戦のスコアを更新する。 */
export async function submitMatchScores(
  input: z.input<typeof submitSchema>,
): Promise<ActionResult<MatchSubmissionResult>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const parsedInput = submitSchema.safeParse(input);
  const payload = parsedInput.success ? parseBookmarkletPayload(parsedInput.data.payload) : null;
  if (!parsedInput.success || !payload || payload.mode !== "tournament") {
    return fail("VALIDATION_ERROR", "送信データの形式が不正です。");
  }
  const { matchId } = parsedInput.data;

  try {
    const context = await loadContext(user.id, matchId);
    if (!context.ok) return context;
    const { match, targetIds, period } = context.data;

    const matched = await matchPlaysToCharts(payload.plays);
    const plays = selectContinuousPlays(matched, targetIds, period);
    if (!plays) return fail("VALIDATION_ERROR", "課題曲3曲を連続して（間隔30分以内）プレイした履歴が見つかりません。");

    const existing = await fetchValidSubmissions({ contextType: "one_v_one", contextId: matchId, userIds: [user.id] });
    if (plays.every((entry) => isDuplicatePlay(existing, entry))) {
      return fail("CONFLICT", "選択したプレイはすでに提出済みです。");
    }

    const submissionId = crypto.randomUUID();
    const submittedAt = new Date().toISOString();
    const songs = plays.map((entry) => ({
      chartId: entry.chartId as string,
      technicalScore: entry.play.technicalScore,
      playDateTime: entry.play.playDateTime,
      jacketImageUrl: entry.play.jacketImageUrl,
    }));

    const before = computeParticipantScore(existing, true);
    const after = computeParticipantScore(
      [
        ...existing,
        {
          id: submissionId,
          userId: user.id,
          submittedAt,
          songs: songs.map(({ chartId, technicalScore }) => ({ chartId, technicalScore })),
        },
      ],
      true,
    );
    const improved = !before || (after !== null && after.totalScore > before.totalScore);

    await insertScoreSubmission({
      id: submissionId,
      submitterId: user.id,
      contextType: "one_v_one",
      contextId: matchId,
      submittedAt,
      songs,
      updateApplied: improved,
    });

    if (improved && after) {
      const admin = createAdminClient();
      const { error } = await admin
        .from("one_v_one_matches")
        .update(
          match.isCreator ? { creator_submission_id: after.submissionId } : { opponent_submission_id: after.submissionId },
        )
        .eq("id", matchId);
      if (error) throw new Error(`failed to update match submission: ${error.message}`);
    }

    revalidatePath(`/one-v-one/${matchId}`);
    return ok({
      matchId,
      totalScore: after?.totalScore ?? songs.reduce((sum, song) => sum + song.technicalScore, 0),
      improved,
      submittedCount: songs.length,
    });
  } catch (cause) {
    return failInternal("submitMatchScores", cause);
  }
}
