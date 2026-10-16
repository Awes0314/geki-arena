"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, failInternal, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getCompetitionDetail,
  getMyParticipation,
  getParticipantSubmissions,
  type CompetitionDetail,
} from "@/lib/competition/queries";
import { computeParticipantScore } from "@/lib/competition/ranking";
import {
  groupCandidatesByChart,
  selectContinuousPlays,
  sortPlaysInPeriod,
  type MatchedPlay,
  type Period,
} from "@/lib/competition/selection";
import { matchPlaysToCharts } from "@/lib/score-submission/chart-candidates";
import { isDuplicatePlay } from "@/lib/score-submission/duplicates";
import { insertScoreSubmission } from "@/lib/score-submission/persist";
import { parseBookmarkletPayload } from "@/lib/score-submission/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SubmittableCompetition = {
  id: string;
  name: string;
  continuousPlayRequired: boolean;
  endAt: string;
};

export type CompetitionSubmissionPreview = {
  continuousPlayRequired: boolean;
  targets: Array<{ chartId: string; title: string; difficulty: string; level: string }>;
  /** 連続プレイ必須の場合の提出候補（課題曲順のプレイidx）。見つからない場合はnull */
  continuousIdx: string[] | null;
  /** 単曲提出可の場合の、課題曲ごとの提出候補プレイidx（スコア降順） */
  candidatesByChart: Record<string, string[]>;
};

export type CompetitionSubmissionResult = {
  competitionId: string;
  totalScore: number;
  /** 既存の記録を更新したか */
  improved: boolean;
  submittedCount: number;
};

const uuid = z.string().uuid();

type Context = { competition: CompetitionDetail; period: Period };

/** 開催中かつ参加中の大会であることを確認し、提出に必要な情報を返す。 */
async function loadContext(userId: string, competitionId: string): Promise<ActionResult<Context>> {
  if (!uuid.safeParse(competitionId).success) return fail("VALIDATION_ERROR", "大会の指定が不正です。");

  const competition = await getCompetitionDetail(competitionId);
  if (!competition) return fail("NOT_FOUND", "大会が見つかりません。");
  if (competition.status !== "ongoing") return fail("CONFLICT", "開催中の大会にのみ提出できます。");

  const participation = await getMyParticipation(competitionId, userId);
  if (participation.state !== "active") return fail("FORBIDDEN", "大会に参加していないため提出できません。");

  return ok({
    competition,
    period: { startAt: new Date(competition.startAt), endAt: new Date(competition.endAt) },
  });
}

/** 提出可能な大会（参加中かつ開催中）の一覧。 */
export async function getSubmittableCompetitions(): Promise<ActionResult<SubmittableCompetition[]>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  try {
    const supabase = await createClient();
    const { data: participations, error } = await supabase
      .from("competition_participants")
      .select("competition_id")
      .eq("user_id", user.id)
      .is("withdrawn_at", null)
      .is("removed_at", null);
    if (error) throw new Error(error.message);
    if (participations.length === 0) return ok([]);

    const nowIso = new Date().toISOString();
    const { data, error: competitionError } = await supabase
      .from("competitions")
      .select("id, name, continuous_play_required, end_at")
      .in(
        "id",
        participations.map((row) => row.competition_id),
      )
      .is("deleted_at", null)
      .lte("start_at", nowIso)
      .gt("end_at", nowIso)
      .order("end_at");
    if (competitionError) throw new Error(competitionError.message);

    return ok(
      data.map((row) => ({
        id: row.id,
        name: row.name,
        continuousPlayRequired: row.continuous_play_required,
        endAt: row.end_at,
      })),
    );
  } catch (cause) {
    return failInternal("getSubmittableCompetitions", cause);
  }
}

type PrepareInput = { payload: unknown; competitionId: string };

/** 受信したプレイ履歴から、選択した大会への提出候補を算出する。 */
export async function prepareCompetitionSubmission(
  input: PrepareInput,
): Promise<ActionResult<CompetitionSubmissionPreview>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const payload = parseBookmarkletPayload(input.payload);
  if (!payload || payload.mode !== "tournament") return fail("VALIDATION_ERROR", "送信データの形式が不正です。");

  try {
    const context = await loadContext(user.id, input.competitionId);
    if (!context.ok) return context;
    const { competition, period } = context.data;

    const matched = await matchPlaysToCharts(payload.plays);
    const targetIds = competition.targetCharts.map((chart) => chart.chartId);

    const continuous = competition.continuousPlayRequired
      ? selectContinuousPlays(matched, targetIds, period)
      : null;
    const candidates = groupCandidatesByChart(matched, targetIds, period);
    const displayOrdered = continuous
      ? [...continuous].sort(
          (a, b) => targetIds.indexOf(a.chartId as string) - targetIds.indexOf(b.chartId as string),
        )
      : null;

    return ok({
      continuousPlayRequired: competition.continuousPlayRequired,
      targets: competition.targetCharts.map(({ chartId, title, difficulty, level }) => ({
        chartId,
        title,
        difficulty,
        level,
      })),
      continuousIdx: displayOrdered?.map((entry) => entry.play.idx) ?? null,
      candidatesByChart: Object.fromEntries(
        [...candidates].map(([chartId, plays]) => [chartId, plays.map((entry) => entry.play.idx)]),
      ),
    });
  } catch (cause) {
    return failInternal("prepareCompetitionSubmission", cause);
  }
}

const submitSchema = z.object({
  payload: z.unknown(),
  competitionId: z.string(),
  selectedIdx: z.array(z.string()).max(50),
});

/** 選択したプレイを大会へ提出する。 */
export async function submitCompetitionScores(
  input: z.input<typeof submitSchema>,
): Promise<ActionResult<CompetitionSubmissionResult>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const parsedInput = submitSchema.safeParse(input);
  const payload = parsedInput.success ? parseBookmarkletPayload(parsedInput.data.payload) : null;
  if (!parsedInput.success || !payload || payload.mode !== "tournament") {
    return fail("VALIDATION_ERROR", "送信データの形式が不正です。");
  }
  const { competitionId, selectedIdx } = parsedInput.data;

  try {
    const context = await loadContext(user.id, competitionId);
    if (!context.ok) return context;
    const { competition, period } = context.data;

    const matched = await matchPlaysToCharts(payload.plays);
    const targetIds = competition.targetCharts.map((chart) => chart.chartId);

    const continuousSet = competition.continuousPlayRequired
      ? selectContinuousPlays(matched, targetIds, period)
      : null;
    const chosen: PickResult = competition.continuousPlayRequired
      ? continuousSet
        ? { ok: true, plays: continuousSet }
        : { ok: false, message: "課題曲を順番通りに連続して（間隔30分以内）プレイした履歴が見つかりません。" }
      : pickSelectedPlays(matched, selectedIdx, targetIds, period);
    if (!chosen.ok) return fail("VALIDATION_ERROR", chosen.message);

    // 提出者・譜面・プレイ日時・テクニカルスコアが同一のプレイは重複とみなす
    const existing = await getParticipantSubmissions(competitionId, user.id);
    const isDuplicate = (entry: MatchedPlay) => isDuplicatePlay(existing, entry);
    const fresh = competition.continuousPlayRequired
      ? chosen.plays.every(isDuplicate)
        ? []
        : chosen.plays
      : chosen.plays.filter((entry) => !isDuplicate(entry));
    if (fresh.length === 0) return fail("CONFLICT", "選択したプレイはすでに提出済みです。");

    const submissionId = crypto.randomUUID();
    const submittedAt = new Date().toISOString();
    const songs = fresh.map((entry) => ({
      chartId: entry.chartId as string,
      technicalScore: entry.play.technicalScore,
      playDateTime: entry.play.playDateTime,
      jacketImageUrl: entry.play.jacketImageUrl,
    }));
    const totalScore = songs.reduce((sum, song) => sum + song.technicalScore, 0);

    const before = computeParticipantScore(existing, competition.continuousPlayRequired);
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
      competition.continuousPlayRequired,
    );
    const improved = !before || (after !== null && after.totalScore > before.totalScore);

    const admin = createAdminClient();
    await insertScoreSubmission({
      id: submissionId,
      submitterId: user.id,
      contextType: "competition",
      contextId: competitionId,
      submittedAt,
      songs,
      updateApplied: improved,
    });

    if (improved && after) {
      const { error } = await admin
        .from("competition_participants")
        .update({ best_submission_id: after.submissionId })
        .eq("competition_id", competitionId)
        .eq("user_id", user.id);
      if (error) throw new Error(`failed to update best submission: ${error.message}`);
    }

    revalidatePath(`/competitions/${competitionId}`);
    return ok({
      competitionId,
      totalScore: after?.totalScore ?? totalScore,
      improved,
      submittedCount: songs.length,
    });
  } catch (cause) {
    return failInternal("submitCompetitionScores", cause);
  }
}

type PickResult = { ok: true; plays: MatchedPlay[] } | { ok: false; message: string };

/** 単曲提出: 指定idxのプレイが課題曲・開催期間の条件を満たし、1曲につき1プレイであることを検証する。 */
function pickSelectedPlays(
  matched: MatchedPlay[],
  selectedIdx: string[],
  targetIds: string[],
  period: Period,
): PickResult {
  if (selectedIdx.length === 0) return { ok: false, message: "提出するプレイを選択してください。" };

  const inPeriod = new Map(sortPlaysInPeriod(matched, period).map((entry) => [entry.play.idx, entry]));
  const chartIds = new Set<string>();
  const plays: MatchedPlay[] = [];
  for (const idx of new Set(selectedIdx)) {
    const entry = inPeriod.get(idx);
    if (!entry?.chartId || !targetIds.includes(entry.chartId)) {
      return { ok: false, message: "課題曲ではない、または開催期間外のプレイが含まれています。" };
    }
    if (chartIds.has(entry.chartId)) return { ok: false, message: "同じ課題曲を複数選択することはできません。" };
    chartIds.add(entry.chartId);
    plays.push(entry);
  }
  return { ok: true, plays: plays.sort((a, b) => targetIds.indexOf(a.chartId!) - targetIds.indexOf(b.chartId!)) };
}
