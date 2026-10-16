import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const ADMIN_SUBMISSION_PAGE_SIZE = 20;
/** テクニカルスコアの上限（score.md） */
export const MAX_TECHNICAL_SCORE = 1_010_000;
/** 要確認フィルタで走査する異常な曲スコアの最大件数 */
const ANOMALY_SCAN_LIMIT = 1000;

export const SUBMISSION_CONTEXTS = ["competition", "one_v_one", "course"] as const;
export type SubmissionContext = (typeof SUBMISSION_CONTEXTS)[number];

export function isSubmissionContext(value: string): value is SubmissionContext {
  return (SUBMISSION_CONTEXTS as readonly string[]).includes(value);
}

type UserRef = { user_no: number; display_name: string };
export type UserSummary = { userNo: number; displayName: string };

export type SubmissionFlag = "invalid" | "unmatched_chart" | "score_out_of_range";

export const SUBMISSION_FLAG_LABELS: Record<SubmissionFlag, string> = {
  invalid: "検証NG",
  unmatched_chart: "譜面未特定",
  score_out_of_range: "スコア範囲外",
};

export type AdminSubmissionListItem = {
  id: string;
  contextType: SubmissionContext;
  contextId: string;
  submittedAt: string;
  totalScore: number;
  submitter: UserSummary | null;
  flags: SubmissionFlag[];
};

export type AdminSongScore = {
  orderIndex: number;
  title: string | null;
  difficultyType: string | null;
  level: string | null;
  playDateTime: string;
  technicalScore: number;
  maxCombo: number | null;
  criticalBreak: number | null;
  breakCount: number | null;
  hitCount: number | null;
  missCount: number | null;
  bellCount: string | null;
  damageCount: number | null;
};

export type AdminSubmissionDetail = AdminSubmissionListItem & {
  updateApplied: boolean;
  songs: AdminSongScore[];
};

const toUser = (user: UserRef | null): UserSummary | null =>
  user ? { userNo: user.user_no, displayName: user.display_name } : null;

type SubmissionRow = {
  id: string;
  context_type: string;
  context_id: string;
  submitted_at: string;
  total_score: number;
  validation_status: string;
  update_applied?: boolean;
  submitter: UserRef | null;
};

type FlagSong = { submission_id: string; chart_id: string | null; technical_score: number };

function computeFlags(row: SubmissionRow, songs: FlagSong[]): SubmissionFlag[] {
  const flags: SubmissionFlag[] = [];
  if (row.validation_status === "invalid") flags.push("invalid");
  if (songs.some((song) => song.chart_id === null)) flags.push("unmatched_chart");
  if (songs.some((song) => song.technical_score < 0 || song.technical_score > MAX_TECHNICAL_SCORE)) {
    flags.push("score_out_of_range");
  }
  return flags;
}

/** 異常な曲スコアを持つ提出と検証NGの提出のIDを集める。 */
async function findAnomalousSubmissionIds(): Promise<string[]> {
  const admin = createAdminClient();
  const [songs, invalid] = await Promise.all([
    admin
      .from("song_scores")
      .select("submission_id")
      .or(`chart_id.is.null,technical_score.gt.${MAX_TECHNICAL_SCORE}`)
      .limit(ANOMALY_SCAN_LIMIT),
    admin.from("score_submissions").select("id").eq("validation_status", "invalid").limit(ANOMALY_SCAN_LIMIT),
  ]);
  const error = songs.error ?? invalid.error;
  if (error) throw new Error(`failed to scan anomalies: ${error.message}`);
  return [...new Set([...(songs.data ?? []).map((row) => row.submission_id), ...(invalid.data ?? []).map((row) => row.id)])];
}

const SUBMISSION_SELECT =
  "id, context_type, context_id, submitted_at, total_score, validation_status, update_applied, submitter:users!score_submissions_submitter_id_fkey(user_no, display_name)";

/** 提出の一覧（新しい順）。anomalyOnlyで要確認の提出のみに絞る。 */
export async function listAdminSubmissions(
  context: SubmissionContext | null,
  anomalyOnly: boolean,
  page: number,
): Promise<{ items: AdminSubmissionListItem[]; total: number }> {
  const admin = createAdminClient();
  const from = (page - 1) * ADMIN_SUBMISSION_PAGE_SIZE;

  let query = admin
    .from("score_submissions")
    .select(SUBMISSION_SELECT, { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, from + ADMIN_SUBMISSION_PAGE_SIZE - 1);
  if (context) query = query.eq("context_type", context);
  if (anomalyOnly) {
    const ids = await findAnomalousSubmissionIds();
    if (ids.length === 0) return { items: [], total: 0 };
    query = query.in("id", ids);
  }

  const { data, count, error } = await query.overrideTypes<SubmissionRow[], { merge: false }>();
  if (error) throw new Error(`failed to fetch submissions: ${error.message}`);
  const rows = data ?? [];

  const { data: songs, error: songError } = rows.length
    ? await admin
        .from("song_scores")
        .select("submission_id, chart_id, technical_score")
        .in(
          "submission_id",
          rows.map((row) => row.id),
        )
    : { data: [], error: null };
  if (songError) throw new Error(`failed to fetch song scores: ${songError.message}`);

  const items = rows.map((row) => ({
    id: row.id,
    contextType: row.context_type as SubmissionContext,
    contextId: row.context_id,
    submittedAt: row.submitted_at,
    totalScore: row.total_score,
    submitter: toUser(row.submitter),
    flags: computeFlags(
      row,
      (songs ?? []).filter((song) => song.submission_id === row.id),
    ),
  }));
  return { items, total: count ?? 0 };
}

type SongRow = {
  order_index: number;
  play_date_time: string;
  technical_score: number;
  chart_id: string | null;
  max_combo: number | null;
  critical_break: number | null;
  break_count: number | null;
  hit_count: number | null;
  miss_count: number | null;
  bell_count: string | null;
  damage_count: number | null;
  chart: { difficulty_type: string; level: string; music: { title: string } | null } | null;
};

/** 提出の詳細（曲ごとの全属性を含む）。存在しない場合はnull。 */
export async function getAdminSubmission(id: string): Promise<AdminSubmissionDetail | null> {
  const admin = createAdminClient();
  const [submission, songs] = await Promise.all([
    admin.from("score_submissions").select(SUBMISSION_SELECT).eq("id", id).maybeSingle().overrideTypes<SubmissionRow, { merge: false }>(),
    admin
      .from("song_scores")
      .select(
        "order_index, play_date_time, technical_score, chart_id, max_combo, critical_break, break_count, hit_count, miss_count, bell_count, damage_count, chart:charts(difficulty_type, level, music:musics(title))",
      )
      .eq("submission_id", id)
      .order("order_index")
      .overrideTypes<SongRow[], { merge: false }>(),
  ]);
  const error = submission.error ?? songs.error;
  if (error) throw new Error(`failed to fetch submission: ${error.message}`);
  const row = submission.data;
  if (!row) return null;

  const songRows = songs.data ?? [];
  return {
    id: row.id,
    contextType: row.context_type as SubmissionContext,
    contextId: row.context_id,
    submittedAt: row.submitted_at,
    totalScore: row.total_score,
    submitter: toUser(row.submitter),
    updateApplied: row.update_applied ?? false,
    flags: computeFlags(
      row,
      songRows.map((song) => ({ submission_id: id, chart_id: song.chart_id, technical_score: song.technical_score })),
    ),
    songs: songRows.map((song) => ({
      orderIndex: song.order_index,
      title: song.chart?.music?.title ?? null,
      difficultyType: song.chart?.difficulty_type ?? null,
      level: song.chart?.level ?? null,
      playDateTime: song.play_date_time,
      technicalScore: song.technical_score,
      maxCombo: song.max_combo,
      criticalBreak: song.critical_break,
      breakCount: song.break_count,
      hitCount: song.hit_count,
      missCount: song.miss_count,
      bellCount: song.bell_count,
      damageCount: song.damage_count,
    })),
  };
}
