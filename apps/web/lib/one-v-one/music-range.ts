import { LEVEL_OPTIONS, levelToNumber } from "@/lib/competition/level";

export const MUSIC_RANGE_TYPES = ["level", "chart_constant"] as const;
export type MusicRangeType = (typeof MUSIC_RANGE_TYPES)[number];

export function isMusicRangeType(value: string | null): value is MusicRangeType {
  return MUSIC_RANGE_TYPES.some((type) => type === value);
}

/** 1v1の楽曲範囲。levelは"+"を+0.5とした数値（13+ = 13.5）、chart_constantは譜面定数。 */
export type MusicRange = { type: MusicRangeType; min: number; max: number };

export const CHART_CONSTANT_MIN = 0;
export const CHART_CONSTANT_MAX = 20;

/** 範囲に含まれるレベル表示値（"13", "13+"など）を返す。 */
export function levelsInRange(range: MusicRange): string[] {
  return LEVEL_OPTIONS.filter((level) => {
    const value = levelToNumber(level);
    return value !== null && value >= range.min && value <= range.max;
  });
}

/** 譜面が範囲内か判定する。 */
export function isChartInRange(chart: { level: string; chartConstant: number }, range: MusicRange): boolean {
  const value = range.type === "level" ? levelToNumber(chart.level) : chart.chartConstant;
  return value !== null && value >= range.min && value <= range.max;
}

/** レベルの数値（13.5）を表示値（13+）に戻す。 */
export function formatLevelNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : `${Math.floor(value)}+`;
}

/** 範囲の表示文字列（例: "Lv.13 〜 Lv.14+" / "譜面定数 13.0 〜 14.5"）。 */
export function formatMusicRange(range: MusicRange): string {
  if (range.type === "level") {
    return `Lv.${formatLevelNumber(range.min)} 〜 Lv.${formatLevelNumber(range.max)}`;
  }
  return `譜面定数 ${range.min.toFixed(1)} 〜 ${range.max.toFixed(1)}`;
}
