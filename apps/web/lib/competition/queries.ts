import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { computeRanking, type RankingEntry, type RankingSubmission } from "@/lib/competition/ranking";
import { getCompetitionStatus, type CompetitionStatus } from "@/lib/competition/period";

export type RatingClassOption = { id: number; label: string; tier: string; sortOrder: number };

export type UserSummary = {
  id: string;
  userNo: number;
  displayName: string;
  iconUrl: string | null;
  rating: { label: string; tier: string } | null;
  badge: { svgUrl: string; courseName: string } | null;
};

export type TargetChart = {
  chartId: string;
  orderIndex: number;
  title: string;
  difficulty: string;
  level: string;
  chartConstant: number;
  jacketImageUrl: string | null;
};

export type CompetitionListItem = {
  id: string;
  name: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: CompetitionStatus;
  continuousPlayRequired: boolean;
  organizer: UserSummary | null;
  participantCount: number;
  ratingMin: RatingClassOption | null;
  ratingMax: RatingClassOption | null;
  targetCharts: TargetChart[];
  /** ログインユーザーとの関係 */
  isOrganizer: boolean;
  isParticipant: boolean;
};

export type CompetitionDetail = {
  id: string;
  name: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: CompetitionStatus;
  continuousPlayRequired: boolean;
  organizer: UserSummary | null;
  ratingMin: RatingClassOption | null;
  ratingMax: RatingClassOption | null;
  targetCharts: TargetChart[];
};

export type RankedParticipant = RankingEntry & { user: UserSummary | null };

const USER_SUMMARY_SELECT = "id, user_no, display_name, icon_url, rating_class_id, displayed_badge_id";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARGET_SELECT =
  "competition_id, chart_id, order_index, charts(level, difficulty_type, chart_constant, jacket_image_url, musics(title))";

type ChartRow = {
  level: string;
  difficulty_type: string;
  chart_constant: number;
  jacket_image_url: string | null;
  musics: { title: string } | Array<{ title: string }> | null;
};
type TargetRow = {
  competition_id: string;
  chart_id: string;
  order_index: number;
  charts: ChartRow | ChartRow[] | null;
};
type BadgeRow = { id: string; svg_asset_url: string; courses: { course_name: string } | null };

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toTargetCharts(rows: TargetRow[]): TargetChart[] {
  return rows
    .flatMap((row) => {
      const chart = first(row.charts);
      const music = chart ? first(chart.musics) : null;
      if (!chart || !music) return [];
      return [
        {
          chartId: row.chart_id,
          orderIndex: row.order_index,
          title: music.title,
          difficulty: chart.difficulty_type,
          level: chart.level,
          chartConstant: chart.chart_constant,
          jacketImageUrl: chart.jacket_image_url,
        },
      ];
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

async function fetchUserSummaries(userIds: string[]): Promise<Map<string, UserSummary>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("users").select(USER_SUMMARY_SELECT).in("id", [...new Set(userIds)]);
  if (error) throw new Error(`failed to fetch users: ${error.message}`);

  const ratingIds = [...new Set(data.flatMap((row) => (row.rating_class_id === null ? [] : [row.rating_class_id])))];
  const badgeIds = [...new Set(data.flatMap((row) => (row.displayed_badge_id === null ? [] : [row.displayed_badge_id])))];
  const [ratings, badges] = await Promise.all([
    ratingIds.length > 0
      ? supabase.from("rating_classes").select("id, label, tier").in("id", ratingIds)
      : Promise.resolve({ data: [], error: null }),
    badgeIds.length > 0
      ? supabase
          .from("course_badges")
          .select("id, svg_asset_url, courses!course_badges_course_id_fkey(course_name)")
          .in("id", badgeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (ratings.error) throw new Error(`failed to fetch rating classes: ${ratings.error.message}`);
  if (badges.error) throw new Error(`failed to fetch badges: ${badges.error.message}`);

  const ratingById = new Map(ratings.data.map((row) => [row.id, { label: row.label, tier: row.tier }]));
  const badgeById = new Map(
    (badges.data as unknown as BadgeRow[]).map((row) => [
      row.id,
      { svgUrl: row.svg_asset_url, courseName: row.courses?.course_name ?? "" },
    ]),
  );

  return new Map(
    data.map((row) => [
      row.id,
      {
        id: row.id,
        userNo: row.user_no,
        displayName: row.display_name,
        iconUrl: row.icon_url,
        rating: row.rating_class_id === null ? null : (ratingById.get(row.rating_class_id) ?? null),
        badge: row.displayed_badge_id === null ? null : (badgeById.get(row.displayed_badge_id) ?? null),
      },
    ]),
  );
}

/** Rating区分マスタ（並び順付き）を取得する。 */
export async function getRatingClassOptions(): Promise<RatingClassOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rating_classes")
    .select("id, label, tier, sort_order")
    .order("sort_order");
  if (error) throw new Error(`failed to fetch rating classes: ${error.message}`);
  return data.map((row) => ({ id: row.id, label: row.label, tier: row.tier, sortOrder: row.sort_order }));
}

/** 大会一覧を取得する（削除済みは除く）。active=終了前の大会を終了が近い順、finished=終了済みを新しい順。 */
export async function listCompetitions(params: {
  status: "active" | "finished";
  viewerId: string;
}): Promise<CompetitionListItem[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let query = supabase.from("competitions").select("*").is("deleted_at", null);
  query = params.status === "active" ? query.gt("end_at", nowIso) : query.lte("end_at", nowIso);

  const { data, error } = await query.order("end_at", { ascending: params.status === "active" }).limit(200);
  if (error) throw new Error(`failed to fetch competitions: ${error.message}`);
  if (data.length === 0) return [];

  const ids = data.map((row) => row.id);
  const [users, ratingClasses, participants, targets] = await Promise.all([
    fetchUserSummaries(data.map((row) => row.organizer_id)),
    getRatingClassOptions(),
    supabase
      .from("competition_participants")
      .select("competition_id, user_id")
      .in("competition_id", ids)
      .is("withdrawn_at", null)
      .is("removed_at", null),
    supabase.from("competition_target_charts").select(TARGET_SELECT).in("competition_id", ids),
  ]);
  if (participants.error) throw new Error(`failed to fetch participants: ${participants.error.message}`);
  if (targets.error) throw new Error(`failed to fetch target charts: ${targets.error.message}`);

  const ratingById = new Map(ratingClasses.map((rating) => [rating.id, rating]));
  const targetRows = targets.data as unknown as TargetRow[];
  const now = new Date();

  return data.map((row) => {
    const members = participants.data.filter((participant) => participant.competition_id === row.id);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      startAt: row.start_at,
      endAt: row.end_at,
      status: getCompetitionStatus(row.start_at, row.end_at, now),
      continuousPlayRequired: row.continuous_play_required,
      organizer: users.get(row.organizer_id) ?? null,
      participantCount: members.length,
      ratingMin: ratingById.get(row.participation_rating_min_id ?? -1) ?? null,
      ratingMax: ratingById.get(row.participation_rating_max_id ?? -1) ?? null,
      targetCharts: toTargetCharts(targetRows.filter((target) => target.competition_id === row.id)),
      isOrganizer: row.organizer_id === params.viewerId,
      isParticipant: members.some((member) => member.user_id === params.viewerId),
    };
  });
}

/** 大会詳細を取得する。存在しない・削除済みはnull。 */
export async function getCompetitionDetail(competitionId: string): Promise<CompetitionDetail | null> {
  if (!UUID_PATTERN.test(competitionId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", competitionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`failed to fetch competition: ${error.message}`);
  if (!data) return null;

  const [users, ratingClasses, targets] = await Promise.all([
    fetchUserSummaries([data.organizer_id]),
    getRatingClassOptions(),
    supabase
      .from("competition_target_charts")
      .select(TARGET_SELECT)
      .eq("competition_id", data.id)
      .order("order_index"),
  ]);
  if (targets.error) throw new Error(`failed to fetch target charts: ${targets.error.message}`);

  const ratingById = new Map(ratingClasses.map((rating) => [rating.id, rating]));
  const targetCharts = toTargetCharts(targets.data as unknown as TargetRow[]);

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    startAt: data.start_at,
    endAt: data.end_at,
    status: getCompetitionStatus(data.start_at, data.end_at, new Date()),
    continuousPlayRequired: data.continuous_play_required,
    organizer: users.get(data.organizer_id) ?? null,
    ratingMin: data.participation_rating_min_id === null ? null : (ratingById.get(data.participation_rating_min_id) ?? null),
    ratingMax: data.participation_rating_max_id === null ? null : (ratingById.get(data.participation_rating_max_id) ?? null),
    targetCharts,
  };
}

/** 現在参加中の参加者（離脱・取消を除く）を参加日時順で取得する。 */
export async function getActiveParticipants(competitionId: string): Promise<Array<UserSummary & { joinedAt: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_participants")
    .select("user_id, joined_at")
    .eq("competition_id", competitionId)
    .is("withdrawn_at", null)
    .is("removed_at", null)
    .order("joined_at");
  if (error) throw new Error(`failed to fetch participants: ${error.message}`);

  const users = await fetchUserSummaries(data.map((row) => row.user_id));
  return data.flatMap((row) => {
    const user = users.get(row.user_id);
    return user ? [{ ...user, joinedAt: row.joined_at }] : [];
  });
}

export type MyParticipation = {
  state: "none" | "active" | "withdrawn" | "removed";
  submissionCount: number;
};

/** ログインユーザー自身の参加状況と、この大会への有効な提出件数。 */
export async function getMyParticipation(competitionId: string, userId: string): Promise<MyParticipation> {
  const supabase = await createClient();
  const [participant, submissions] = await Promise.all([
    supabase
      .from("competition_participants")
      .select("withdrawn_at, removed_at")
      .eq("competition_id", competitionId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("score_submissions")
      .select("id", { count: "exact", head: true })
      .eq("context_type", "competition")
      .eq("context_id", competitionId)
      .eq("submitter_id", userId)
      .eq("validation_status", "valid"),
  ]);
  if (participant.error) throw new Error(`failed to fetch participation: ${participant.error.message}`);
  if (submissions.error) throw new Error(`failed to fetch submissions: ${submissions.error.message}`);

  const row = participant.data;
  const state = !row ? "none" : row.removed_at ? "removed" : row.withdrawn_at ? "withdrawn" : "active";
  return { state, submissionCount: submissions.count ?? 0 };
}

/** 参加中ユーザーの有効な提出（課題曲ごとのスコア付き）を取得する。内訳はRLSで非公開のためService Roleで必要な列のみ読む。 */
export async function getParticipantSubmissions(
  competitionId: string,
  userId?: string,
): Promise<RankingSubmission[]> {
  const admin = createAdminClient();
  let participantQuery = admin
    .from("competition_participants")
    .select("user_id")
    .eq("competition_id", competitionId)
    .is("withdrawn_at", null)
    .is("removed_at", null);
  if (userId) participantQuery = participantQuery.eq("user_id", userId);
  const { data: participants, error: participantError } = await participantQuery;
  if (participantError) throw new Error(`failed to fetch participants: ${participantError.message}`);
  if (participants.length === 0) return [];

  const { data: submissions, error } = await admin
    .from("score_submissions")
    .select("id, submitter_id, submitted_at")
    .eq("context_type", "competition")
    .eq("context_id", competitionId)
    .eq("validation_status", "valid")
    .in(
      "submitter_id",
      participants.map((row) => row.user_id),
    );
  if (error) throw new Error(`failed to fetch submissions: ${error.message}`);
  if (submissions.length === 0) return [];

  const { data: songs, error: songError } = await admin
    .from("song_scores")
    .select("submission_id, chart_id, technical_score, play_date_time")
    .in(
      "submission_id",
      submissions.map((row) => row.id),
    );
  if (songError) throw new Error(`failed to fetch song scores: ${songError.message}`);

  return submissions.map((submission) => ({
    id: submission.id,
    userId: submission.submitter_id,
    submittedAt: submission.submitted_at,
    songs: songs
      .filter((song) => song.submission_id === submission.id && song.chart_id !== null)
      .map((song) => ({
        chartId: song.chart_id as string,
        technicalScore: song.technical_score,
        playDateTime: song.play_date_time,
      })),
  }));
}

/** 大会ランキング（スコア降順、同点は到達日時の早い順）。 */
export async function getCompetitionRanking(
  competitionId: string,
  continuousPlayRequired: boolean,
): Promise<RankedParticipant[]> {
  const submissions = await getParticipantSubmissions(competitionId);
  const ranking = computeRanking(submissions, continuousPlayRequired);
  const users = await fetchUserSummaries(ranking.map((entry) => entry.userId));
  return ranking.map((entry) => ({ ...entry, user: users.get(entry.userId) ?? null }));
}

export type SubmissionSongScore = {
  chartId: string;
  technicalScore: number;
  playDateTime: string;
};

export type ParticipantSubmissionStatus = UserSummary & {
  joinedAt: string;
  submissions: Array<{ id: string; submittedAt: string; totalScore: number; songs: SubmissionSongScore[] }>;
};

/** 主催者向け: 参加者ごとの提出状況・履歴（曲ごとのテクニカルスコアを含む）。呼び出し前に主催者であることを確認すること。 */
export async function getParticipantSubmissionStatuses(
  competitionId: string,
): Promise<ParticipantSubmissionStatus[]> {
  const participants = await getActiveParticipants(competitionId);
  if (participants.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("score_submissions")
    .select("id, submitter_id, submitted_at, total_score")
    .eq("context_type", "competition")
    .eq("context_id", competitionId)
    .eq("validation_status", "valid")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(`failed to fetch submissions: ${error.message}`);

  const { data: songs, error: songError } =
    data.length === 0
      ? { data: [], error: null }
      : await admin
          .from("song_scores")
          .select("submission_id, order_index, chart_id, technical_score, play_date_time")
          .in(
            "submission_id",
            data.map((row) => row.id),
          )
          .order("order_index");
  if (songError) throw new Error(`failed to fetch song scores: ${songError.message}`);

  return participants.map((participant) => ({
    ...participant,
    submissions: data
      .filter((row) => row.submitter_id === participant.id)
      .map((row) => ({
        id: row.id,
        submittedAt: row.submitted_at,
        totalScore: row.total_score,
        songs: songs
          .filter((song) => song.submission_id === row.id && song.chart_id !== null)
          .map((song) => ({
            chartId: song.chart_id as string,
            technicalScore: song.technical_score,
            playDateTime: song.play_date_time,
          })),
      })),
  }));
}
