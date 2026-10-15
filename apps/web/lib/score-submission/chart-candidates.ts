import type { ChartCandidate } from "@/lib/score-submission/chart-matching";
import { matchChart } from "@/lib/score-submission/chart-matching";
import type { BookmarkletPlay } from "@/lib/score-submission/schema";
import { createClient } from "@/lib/supabase/server";
import type { MatchedPlay } from "@/lib/competition/selection";

/** 指定した楽曲名に該当する有効な譜面を取得する。 */
export async function fetchChartCandidates(titles: string[]): Promise<ChartCandidate[]> {
  if (titles.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charts")
    .select("id, difficulty_type, level, jacket_image_url, musics!inner(title)")
    .eq("is_active", true)
    .in("musics.title", titles);
  if (error) throw new Error(`failed to fetch charts: ${error.message}`);

  return data.flatMap((row) => {
    const music = Array.isArray(row.musics) ? row.musics[0] : row.musics;
    if (!music) return [];
    return [
      {
        chartId: row.id,
        title: music.title,
        difficulty: row.difficulty_type,
        level: row.level,
        jacketImageUrl: row.jacket_image_url,
      },
    ];
  });
}

/** プレイ履歴を譜面マスタと照合する。特定できないプレイのchartIdはnull。 */
export async function matchPlaysToCharts(plays: BookmarkletPlay[]): Promise<MatchedPlay[]> {
  const candidates = await fetchChartCandidates([...new Set(plays.map((play) => play.title))]);
  return plays.map((play) => ({ play, chartId: matchChart(play, candidates)?.chartId ?? null }));
}
