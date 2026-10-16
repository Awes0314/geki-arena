import "server-only";

import { getCompetitionStatus, type CompetitionStatus } from "@/lib/competition/period";
import { createAdminClient } from "@/lib/supabase/admin";

export const ADMIN_COMPETITION_PAGE_SIZE = 20;

export const COMPETITION_FILTERS = ["scheduled", "ongoing", "finished", "deleted"] as const;
export type CompetitionFilter = (typeof COMPETITION_FILTERS)[number];

export function isCompetitionFilter(value: string): value is CompetitionFilter {
  return (COMPETITION_FILTERS as readonly string[]).includes(value);
}

type UserRef = { user_no: number; display_name: string };
type UserSummary = { userNo: number; displayName: string };

export type AdminCompetitionListItem = {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  status: CompetitionStatus;
  deleted: boolean;
  organizer: UserSummary | null;
};

export type AdminCompetitionParticipant = {
  userId: string;
  user: UserSummary | null;
  joinedAt: string;
  withdrawnAt: string | null;
  removedAt: string | null;
  submissionCount: number;
  bestScore: number | null;
};

export type AdminCompetitionDetail = {
  id: string;
  name: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: CompetitionStatus;
  continuousPlayRequired: boolean;
  deletedAt: string | null;
  createdAt: string;
  organizer: UserSummary | null;
  targetCharts: { chartId: string; title: string; difficultyType: string; level: string }[];
  participants: AdminCompetitionParticipant[];
};

const toUser = (user: UserRef | null): UserSummary | null =>
  user ? { userNo: user.user_no, displayName: user.display_name } : null;

function sanitizeKeyword(keyword: string): string {
  return keyword.replace(/[%_\\,()]/g, " ").trim();
}

type ListRow = {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  deleted_at: string | null;
  organizer: UserRef | null;
};

/** 大会名の部分一致・状態で絞り込んだ一覧を取得する（削除済みは「deleted」指定時のみ）。 */
export async function listAdminCompetitions(
  keyword: string,
  filter: CompetitionFilter | null,
  page: number,
  now: Date = new Date(),
): Promise<{ items: AdminCompetitionListItem[]; total: number }> {
  const from = (page - 1) * ADMIN_COMPETITION_PAGE_SIZE;
  const nowIso = now.toISOString();
  let query = createAdminClient()
    .from("competitions")
    .select("id, name, start_at, end_at, deleted_at, organizer:users!competitions_organizer_id_fkey(user_no, display_name)", {
      count: "exact",
    })
    .order("start_at", { ascending: false })
    .range(from, from + ADMIN_COMPETITION_PAGE_SIZE - 1);

  if (filter === "deleted") query = query.not("deleted_at", "is", null);
  else query = query.is("deleted_at", null);
  if (filter === "scheduled") query = query.gt("start_at", nowIso);
  if (filter === "ongoing") query = query.lte("start_at", nowIso).gt("end_at", nowIso);
  if (filter === "finished") query = query.lte("end_at", nowIso);

  const safe = sanitizeKeyword(keyword);
  if (safe) query = query.ilike("name", `%${safe}%`);

  const { data, count, error } = await query.overrideTypes<ListRow[], { merge: false }>();
  if (error) throw new Error(`failed to fetch competitions: ${error.message}`);

  const items = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    startAt: row.start_at,
    endAt: row.end_at,
    status: getCompetitionStatus(row.start_at, row.end_at, now),
    deleted: row.deleted_at !== null,
    organizer: toUser(row.organizer),
  }));
  return { items, total: count ?? 0 };
}

type DetailRow = {
  id: string;
  name: string;
  description: string | null;
  start_at: string;
  end_at: string;
  continuous_play_required: boolean;
  deleted_at: string | null;
  created_at: string;
  organizer: UserRef | null;
};

type TargetChartRow = {
  order_index: number;
  chart: { id: string; difficulty_type: string; level: string; music: { title: string } | null } | null;
};

type ParticipantRow = {
  user_id: string;
  joined_at: string;
  withdrawn_at: string | null;
  removed_at: string | null;
  best_submission_id: string | null;
  user: UserRef | null;
};

/** 大会の詳細（削除済みを含む）。存在しない場合はnull。 */
export async function getAdminCompetition(
  id: string,
  now: Date = new Date(),
): Promise<AdminCompetitionDetail | null> {
  const admin = createAdminClient();
  const { data: competition, error } = await admin
    .from("competitions")
    .select(
      "id, name, description, start_at, end_at, continuous_play_required, deleted_at, created_at, organizer:users!competitions_organizer_id_fkey(user_no, display_name)",
    )
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<DetailRow, { merge: false }>();
  if (error) throw new Error(`failed to fetch competition: ${error.message}`);
  if (!competition) return null;

  const [targets, participants, submissions] = await Promise.all([
    admin
      .from("competition_target_charts")
      .select("order_index, chart:charts(id, difficulty_type, level, music:musics(title))")
      .eq("competition_id", id)
      .order("order_index")
      .overrideTypes<TargetChartRow[], { merge: false }>(),
    admin
      .from("competition_participants")
      .select(
        "user_id, joined_at, withdrawn_at, removed_at, best_submission_id, user:users!competition_participants_user_id_fkey(user_no, display_name)",
      )
      .eq("competition_id", id)
      .order("joined_at")
      .overrideTypes<ParticipantRow[], { merge: false }>(),
    admin
      .from("score_submissions")
      .select("id, submitter_id, total_score")
      .eq("context_type", "competition")
      .eq("context_id", id),
  ]);
  const failed = [targets, participants, submissions].find((result) => result.error)?.error;
  if (failed) throw new Error(`failed to fetch competition detail: ${failed.message}`);

  const submissionRows = submissions.data ?? [];
  return {
    id: competition.id,
    name: competition.name,
    description: competition.description,
    startAt: competition.start_at,
    endAt: competition.end_at,
    status: getCompetitionStatus(competition.start_at, competition.end_at, now),
    continuousPlayRequired: competition.continuous_play_required,
    deletedAt: competition.deleted_at,
    createdAt: competition.created_at,
    organizer: toUser(competition.organizer),
    targetCharts: (targets.data ?? []).flatMap((row) =>
      row.chart
        ? [
            {
              chartId: row.chart.id,
              title: row.chart.music?.title ?? "(不明)",
              difficultyType: row.chart.difficulty_type,
              level: row.chart.level,
            },
          ]
        : [],
    ),
    participants: (participants.data ?? []).map((row) => {
      const own = submissionRows.filter((submission) => submission.submitter_id === row.user_id);
      const best = row.best_submission_id
        ? (submissionRows.find((submission) => submission.id === row.best_submission_id)?.total_score ?? null)
        : null;
      return {
        userId: row.user_id,
        user: toUser(row.user),
        joinedAt: row.joined_at,
        withdrawnAt: row.withdrawn_at,
        removedAt: row.removed_at,
        submissionCount: own.length,
        bestScore: best,
      };
    }),
  };
}
