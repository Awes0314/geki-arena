import type { BookmarkletPlay } from "@/lib/score-submission/schema";

/** 譜面マスタと照合済みのプレイ。譜面を特定できない場合chartIdはnull。 */
export type MatchedPlay = { play: BookmarkletPlay; chartId: string | null };

export type Period = { startAt: Date; endAt: Date };

/** 連続プレイとみなす隣接プレイ間の最大間隔（score.md）。 */
export const CONTINUOUS_MAX_GAP_MS = 30 * 60 * 1000;

function playTime(matched: MatchedPlay): number {
  return new Date(matched.play.playDateTime).getTime();
}

/** 開催期間内のプレイのみを、プレイ日時の昇順（同時刻は元の順序）で返す。 */
export function sortPlaysInPeriod(plays: MatchedPlay[], period: Period): MatchedPlay[] {
  return plays
    .map((matched, index) => ({ matched, index }))
    .filter(({ matched }) => {
      const t = playTime(matched);
      return t >= period.startAt.getTime() && t <= period.endAt.getTime();
    })
    .sort((a, b) => playTime(a.matched) - playTime(b.matched) || a.index - b.index)
    .map(({ matched }) => matched);
}

/**
 * 連続プレイの提出候補を選ぶ。履歴上で連続して並び、譜面が課題曲の集合と一致し（順不同）、
 * 隣接プレイの間隔が30分以内の組のうち、合計テクニカルスコアが最大のものをプレイ順で返す。
 */
export function selectContinuousPlays(
  plays: MatchedPlay[],
  targetChartIds: string[],
  period: Period,
): MatchedPlay[] | null {
  const sorted = sortPlaysInPeriod(plays, period);
  const size = targetChartIds.length;
  const targets = new Set(targetChartIds);
  let best: { window: MatchedPlay[]; total: number } | null = null;

  for (let start = 0; start + size <= sorted.length; start++) {
    const window = sorted.slice(start, start + size);
    const chartIds = new Set(window.map((matched) => matched.chartId));
    const sameSet = chartIds.size === size && [...chartIds].every((id) => id !== null && targets.has(id));
    const contiguous = window.every((matched, k) => k === 0 || playTime(matched) - playTime(window[k - 1]) <= CONTINUOUS_MAX_GAP_MS);
    if (!sameSet || !contiguous) continue;

    const total = window.reduce((sum, matched) => sum + matched.play.technicalScore, 0);
    if (!best || total > best.total) best = { window, total };
  }
  return best?.window ?? null;
}

/** 課題曲ごとの、開催期間内の提出候補プレイ（スコア降順）。 */
export function groupCandidatesByChart(
  plays: MatchedPlay[],
  targetChartIds: string[],
  period: Period,
): Map<string, MatchedPlay[]> {
  const result = new Map<string, MatchedPlay[]>(targetChartIds.map((id) => [id, []]));
  for (const matched of sortPlaysInPeriod(plays, period)) {
    if (matched.chartId) result.get(matched.chartId)?.push(matched);
  }
  for (const candidates of result.values()) {
    candidates.sort((a, b) => b.play.technicalScore - a.play.technicalScore);
  }
  return result;
}
