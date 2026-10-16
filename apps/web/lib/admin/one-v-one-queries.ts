import "server-only";

import {
  getMatchStatus,
  type OneVOneStatus,
  type StoredMatchStatus,
} from "@/lib/one-v-one/status";
import { createAdminClient } from "@/lib/supabase/admin";

export const ADMIN_MATCH_PAGE_SIZE = 20;

export const MATCH_FILTERS = ["recruiting", "pending_acceptance", "established", "deleted"] as const;
export type MatchFilter = (typeof MATCH_FILTERS)[number];

export function isMatchFilter(value: string): value is MatchFilter {
  return (MATCH_FILTERS as readonly string[]).includes(value);
}

type UserRef = { user_no: number; display_name: string };
type UserSummary = { userNo: number; displayName: string };
type ChartRef = { difficulty_type: string; level: string; music: { title: string } | null };

export type ChartSummary = { title: string; difficultyType: string; level: string };

export type AdminMatchListItem = {
  id: string;
  createdAt: string;
  status: OneVOneStatus | null;
  creator: UserSummary | null;
  opponent: UserSummary | null;
  creatorChart: ChartSummary | null;
};

export type AdminMatchDetail = AdminMatchListItem & {
  startAt: string | null;
  endAt: string | null;
  deletedAt: string | null;
  opponentChart: ChartSummary | null;
  randomChart: ChartSummary | null;
  creatorScore: number | null;
  opponentScore: number | null;
};

const toUser = (user: UserRef | null): UserSummary | null =>
  user ? { userNo: user.user_no, displayName: user.display_name } : null;

const toChart = (chart: ChartRef | null): ChartSummary | null =>
  chart ? { title: chart.music?.title ?? "(不明)", difficultyType: chart.difficulty_type, level: chart.level } : null;

const CHART_SELECT = "difficulty_type, level, music:musics(title)";
const USER_SELECT = "user_no, display_name";

type ListRow = {
  id: string;
  status: StoredMatchStatus;
  created_at: string;
  end_at: string | null;
  creator: UserRef | null;
  opponent: UserRef | null;
  creator_chart: ChartRef | null;
};

function toListItem(row: ListRow, now: Date): AdminMatchListItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: getMatchStatus({ status: row.status, createdAt: row.created_at, endAt: row.end_at }, now),
    creator: toUser(row.creator),
    opponent: toUser(row.opponent),
    creatorChart: toChart(row.creator_chart),
  };
}

/** 状態（保存値）で絞り込んだ1v1対戦の一覧。未指定時は削除済みを除く。 */
export async function listAdminMatches(
  filter: MatchFilter | null,
  page: number,
  now: Date = new Date(),
): Promise<{ items: AdminMatchListItem[]; total: number }> {
  const from = (page - 1) * ADMIN_MATCH_PAGE_SIZE;
  let query = createAdminClient()
    .from("one_v_one_matches")
    .select(
      `id, status, created_at, end_at,
       creator:users!one_v_one_matches_creator_id_fkey(${USER_SELECT}),
       opponent:users!one_v_one_matches_opponent_user_id_fkey(${USER_SELECT}),
       creator_chart:charts!one_v_one_matches_creator_chart_id_fkey(${CHART_SELECT})`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_MATCH_PAGE_SIZE - 1);

  query = filter ? query.eq("status", filter) : query.neq("status", "deleted");

  const { data, count, error } = await query.overrideTypes<ListRow[], { merge: false }>();
  if (error) throw new Error(`failed to fetch matches: ${error.message}`);
  return { items: (data ?? []).map((row) => toListItem(row, now)), total: count ?? 0 };
}

type DetailRow = ListRow & {
  start_at: string | null;
  deleted_at: string | null;
  creator_submission_id: string | null;
  opponent_submission_id: string | null;
  opponent_chart: ChartRef | null;
  random_chart: ChartRef | null;
};

/** 1v1対戦の詳細（削除済みを含む）。存在しない場合はnull。 */
export async function getAdminMatch(id: string, now: Date = new Date()): Promise<AdminMatchDetail | null> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("one_v_one_matches")
    .select(
      `id, status, created_at, start_at, end_at, deleted_at, creator_submission_id, opponent_submission_id,
       creator:users!one_v_one_matches_creator_id_fkey(${USER_SELECT}),
       opponent:users!one_v_one_matches_opponent_user_id_fkey(${USER_SELECT}),
       creator_chart:charts!one_v_one_matches_creator_chart_id_fkey(${CHART_SELECT}),
       opponent_chart:charts!one_v_one_matches_opponent_selected_chart_id_fkey(${CHART_SELECT}),
       random_chart:charts!one_v_one_matches_random_selected_chart_id_fkey(${CHART_SELECT})`,
    )
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<DetailRow, { merge: false }>();
  if (error) throw new Error(`failed to fetch match: ${error.message}`);
  if (!row) return null;

  const submissionIds = [row.creator_submission_id, row.opponent_submission_id].filter(
    (value): value is string => value !== null,
  );
  const scores = new Map<string, number>();
  if (submissionIds.length > 0) {
    const { data, error: scoreError } = await admin
      .from("score_submissions")
      .select("id, total_score")
      .in("id", submissionIds);
    if (scoreError) throw new Error(`failed to fetch scores: ${scoreError.message}`);
    for (const submission of data ?? []) scores.set(submission.id, submission.total_score);
  }

  const scoreOf = (submissionId: string | null) => (submissionId ? (scores.get(submissionId) ?? null) : null);
  return {
    ...toListItem(row, now),
    startAt: row.start_at,
    endAt: row.end_at,
    deletedAt: row.deleted_at,
    opponentChart: toChart(row.opponent_chart),
    randomChart: toChart(row.random_chart),
    creatorScore: scoreOf(row.creator_submission_id),
    opponentScore: scoreOf(row.opponent_submission_id),
  };
}
