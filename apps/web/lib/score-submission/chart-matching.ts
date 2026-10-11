import type { BookmarkletPlay } from "@/lib/score-submission/schema";

/** 照合対象の有効な譜面(is_active = true)。 */
export type ChartCandidate = {
  chartId: string;
  title: string;
  difficulty: string;
  level: string;
  jacketImageUrl: string | null;
};

/**
 * オンゲキNETのプレイ履歴から譜面を特定する(ongeki-net.md の Chart Matching)。
 * 一意に絞れない場合はnull。
 */
export function matchChart(
  play: Pick<BookmarkletPlay, "title" | "difficulty" | "jacketImageUrl">,
  charts: ChartCandidate[],
): ChartCandidate | null {
  const byTitleAndDifficulty = charts.filter(
    (chart) => chart.title === play.title && chart.difficulty === play.difficulty,
  );
  if (byTitleAndDifficulty.length <= 1) return byTitleAndDifficulty[0] ?? null;

  const byJacket = byTitleAndDifficulty.filter((chart) => chart.jacketImageUrl === play.jacketImageUrl);
  return byJacket.length === 1 ? byJacket[0] : null;
}
