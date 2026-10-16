import {
  fetchUserSummaries,
  getRatingClassOptions,
  type RatingClassOption,
  type UserSummary,
} from "@/lib/competition/queries";
import { computeParticipantScore } from "@/lib/competition/ranking";
import { isMusicRangeType, type MusicRange } from "@/lib/one-v-one/music-range";
import {
  decideOutcome,
  getMatchStatus,
  type MatchOutcome,
  type OneVOneStatus,
  type StoredMatchStatus,
} from "@/lib/one-v-one/status";
import { fetchValidSubmissions } from "@/lib/score-submission/queries";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type MatchChart = {
  chartId: string;
  title: string;
  difficulty: string;
  level: string;
  chartConstant: number;
  jacketImageUrl: string | null;
};

export type OneVOneListItem = {
  id: string;
  status: OneVOneStatus;
  createdAt: string;
  startAt: string | null;
  endAt: string | null;
  creator: UserSummary | null;
  /** 指定された対戦相手、または挑戦者 */
  opponent: UserSummary | null;
  creatorChart: MatchChart | null;
  opponentChart: MatchChart | null;
  randomChart: MatchChart | null;
  range: MusicRange;
  ratingMin: RatingClassOption | null;
  ratingMax: RatingClassOption | null;
  isCreator: boolean;
  isOpponent: boolean;
};

export type OneVOneDetail = OneVOneListItem & {
  creatorScore: number | null;
  opponentScore: number | null;
  /** 終了後のみ設定 */
  outcome: MatchOutcome | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_LIMIT = 200;

type ChartRow = {
  id: string;
  level: string;
  difficulty_type: string;
  chart_constant: number;
  jacket_image_url: string | null;
  musics: { title: string } | Array<{ title: string }> | null;
};

async function fetchCharts(chartIds: string[]): Promise<Map<string, MatchChart>> {
  const ids = [...new Set(chartIds)];
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charts")
    .select("id, level, difficulty_type, chart_constant, jacket_image_url, musics(title)")
    .in("id", ids);
  if (error) throw new Error(`failed to fetch charts: ${error.message}`);

  return new Map(
    (data as unknown as ChartRow[]).flatMap((row): Array<[string, MatchChart]> => {
      const music = Array.isArray(row.musics) ? row.musics[0] : row.musics;
      if (!music) return [];
      return [
        [
          row.id,
          {
            chartId: row.id,
            title: music.title,
            difficulty: row.difficulty_type,
            level: row.level,
            chartConstant: row.chart_constant,
            jacketImageUrl: row.jacket_image_url,
          },
        ],
      ];
    }),
  );
}

function toRange(row: Tables<"one_v_one_matches">): MusicRange | null {
  if (!isMusicRangeType(row.random_range_type)) return null;
  return { type: row.random_range_type, min: Number(row.random_range_min), max: Number(row.random_range_max) };
}

async function toListItems(rows: Tables<"one_v_one_matches">[], viewerId: string): Promise<OneVOneListItem[]> {
  if (rows.length === 0) return [];
  const [users, ratingClasses, charts] = await Promise.all([
    fetchUserSummaries(rows.flatMap((row) => [row.creator_id, ...(row.opponent_user_id ? [row.opponent_user_id] : [])])),
    getRatingClassOptions(),
    fetchCharts(
      rows.flatMap((row) =>
        [row.creator_chart_id, row.opponent_selected_chart_id, row.random_selected_chart_id].filter(
          (id): id is string => id !== null,
        ),
      ),
    ),
  ]);
  const ratingById = new Map(ratingClasses.map((rating) => [rating.id, rating]));
  const now = new Date();

  return rows.flatMap((row): OneVOneListItem[] => {
    const range = toRange(row);
    const status = getMatchStatus(
      { status: row.status as StoredMatchStatus, createdAt: row.created_at, endAt: row.end_at },
      now,
    );
    if (!range || !status) return [];
    return [
      {
        id: row.id,
        status,
        createdAt: row.created_at,
        startAt: row.start_at,
        endAt: row.end_at,
        creator: users.get(row.creator_id) ?? null,
        opponent: row.opponent_user_id ? (users.get(row.opponent_user_id) ?? null) : null,
        creatorChart: charts.get(row.creator_chart_id) ?? null,
        opponentChart: row.opponent_selected_chart_id ? (charts.get(row.opponent_selected_chart_id) ?? null) : null,
        randomChart: row.random_selected_chart_id ? (charts.get(row.random_selected_chart_id) ?? null) : null,
        range,
        ratingMin: ratingById.get(row.recruiting_rating_min_id ?? -1) ?? null,
        ratingMax: ratingById.get(row.recruiting_rating_max_id ?? -1) ?? null,
        isCreator: row.creator_id === viewerId,
        isOpponent: row.opponent_user_id === viewerId,
      },
    ];
  });
}

export type MatchListTab = "recruiting" | "mine";

/** 1v1一覧。recruiting=期限内の募集中の対戦、mine=自身が関わる対戦（期限切れ・削除済みを除く）。 */
export async function listMatches(params: { tab: MatchListTab; viewerId: string }): Promise<OneVOneListItem[]> {
  const supabase = await createClient();
  let query = supabase.from("one_v_one_matches").select("*").is("deleted_at", null);
  query =
    params.tab === "recruiting"
      ? query.eq("status", "recruiting")
      : query.or(`creator_id.eq.${params.viewerId},opponent_user_id.eq.${params.viewerId}`);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(LIST_LIMIT);
  if (error) throw new Error(`failed to fetch matches: ${error.message}`);

  const items = await toListItems(data, params.viewerId);
  return items.filter((item) => item.status !== "expired");
}

/** 1v1詳細（スコア・勝敗を含む）。存在しない・削除済みはnull。期限切れも取得できる。 */
export async function getMatchDetail(matchId: string, viewerId: string): Promise<OneVOneDetail | null> {
  if (!UUID_PATTERN.test(matchId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("one_v_one_matches")
    .select("*")
    .eq("id", matchId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`failed to fetch match: ${error.message}`);
  if (!data) return null;

  const [item] = await toListItems([data], viewerId);
  if (!item) return null;

  const hasStarted = item.status === "established" || item.status === "finished";
  const participantIds = [data.creator_id, ...(data.opponent_user_id ? [data.opponent_user_id] : [])];
  const submissions = hasStarted
    ? await fetchValidSubmissions({ contextType: "one_v_one", contextId: data.id, userIds: participantIds })
    : [];
  const scoreOf = (userId: string | null) =>
    userId === null
      ? null
      : (computeParticipantScore(
          submissions.filter((submission) => submission.userId === userId),
          true,
        )?.totalScore ?? null);
  const creatorScore = scoreOf(data.creator_id);
  const opponentScore = scoreOf(data.opponent_user_id);

  return {
    ...item,
    creatorScore,
    opponentScore,
    outcome: item.status === "finished" ? decideOutcome(creatorScore, opponentScore) : null,
  };
}
