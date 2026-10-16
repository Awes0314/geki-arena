import { randomInt } from "node:crypto";

import { levelsInRange, isChartInRange, type MusicRange } from "@/lib/one-v-one/music-range";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

/** 範囲内の有効な譜面IDをすべて取得する。 */
async function fetchChartIdsInRange(range: MusicRange): Promise<string[]> {
  const supabase = await createClient();
  const levels = range.type === "level" ? levelsInRange(range) : [];
  if (range.type === "level" && levels.length === 0) return [];

  const ids: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const base = supabase
      .from("charts")
      .select("id")
      .eq("is_active", true)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    const { data, error } =
      range.type === "level"
        ? await base.in("level", levels)
        : await base.gte("chart_constant", range.min).lte("chart_constant", range.max);
    if (error) throw new Error(`failed to fetch charts in range: ${error.message}`);
    ids.push(...data.map((row) => row.id));
    if (data.length < PAGE_SIZE) return ids;
  }
}

/** 範囲内の譜面から、除外する譜面を除いた候補の数を返す。 */
export async function countChartsInRange(range: MusicRange, excludeIds: string[]): Promise<number> {
  const excluded = new Set(excludeIds);
  return (await fetchChartIdsInRange(range)).filter((id) => !excluded.has(id)).length;
}

/** 範囲内の譜面から、除外する譜面を除いて1曲をランダムに選ぶ。候補がなければnull。 */
export async function pickRandomChartId(range: MusicRange, excludeIds: string[]): Promise<string | null> {
  const excluded = new Set(excludeIds);
  const candidates = (await fetchChartIdsInRange(range)).filter((id) => !excluded.has(id));
  return candidates.length === 0 ? null : candidates[randomInt(candidates.length)];
}

/** 有効な譜面か確認する。rangeを指定した場合は範囲内であることも確認する。 */
export async function isChartSelectable(chartId: string, range?: MusicRange): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charts")
    .select("level, chart_constant")
    .eq("id", chartId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`failed to fetch chart: ${error.message}`);
  if (!data) return false;
  return range ? isChartInRange({ level: data.level, chartConstant: data.chart_constant }, range) : true;
}
