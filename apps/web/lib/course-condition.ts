/** テクニカルスコアの上限（score.md） */
export const MAX_TECHNICAL_SCORE = 1_010_000;
/** 個数条件の入力上限 */
export const MAX_COUNT_LIMIT = 99_999;

export const METRIC_KEYS = [
  "minScore",
  "maxBreakOrBelow",
  "maxHitOrBelow",
  "maxMiss",
  "maxBellMissed",
  "maxDamage",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

type MetricDef = { label: string; hint: string; max: (scope: "perChart" | "total") => number };

/** 合格条件の項目。minScoreは下限、それ以外は上限（xx個以下）。 */
export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  minScore: {
    label: "テクニカルスコア(以上)",
    hint: "最低スコア",
    max: (scope) => (scope === "total" ? MAX_TECHNICAL_SCORE * 10 : MAX_TECHNICAL_SCORE),
  },
  maxBreakOrBelow: { label: "BREAK以下(以下)", hint: "BREAK+HIT+MISSの合計", max: () => MAX_COUNT_LIMIT },
  maxHitOrBelow: { label: "HIT以下(以下)", hint: "HIT+MISSの合計", max: () => MAX_COUNT_LIMIT },
  maxMiss: { label: "MISS(以下)", hint: "MISS数", max: () => MAX_COUNT_LIMIT },
  maxBellMissed: { label: "BELL取りこぼし(以下)", hint: "最大BELL数−取得BELL数", max: () => MAX_COUNT_LIMIT },
  maxDamage: { label: "DAMAGE(以下)", hint: "DAMAGE数", max: () => MAX_COUNT_LIMIT },
};

/** 1つの範囲（曲個別または通し）に対する条件。未設定はnull。 */
export type ConditionMetrics = Record<MetricKey, number | null>;

/** コースのクリア条件。設定した項目をすべて満たすと合格。perChartは譜面順(order_index)。 */
export type ClearCondition = {
  perChart: ConditionMetrics[];
  total: ConditionMetrics;
};

export function emptyMetrics(): ConditionMetrics {
  return { minScore: null, maxBreakOrBelow: null, maxHitOrBelow: null, maxMiss: null, maxBellMissed: null, maxDamage: null };
}

const toLimit = (item: unknown): number | null =>
  typeof item === "number" && Number.isInteger(item) && item >= 0 ? item : null;

function readMetrics(value: unknown): ConditionMetrics {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const metrics = emptyMetrics();
  for (const key of METRIC_KEYS) metrics[key] = toLimit(record[key]);
  return metrics;
}

/** 保存済みのclear_condition(JSON)を安全に読み取る。旧形式(minScores/minTotalScore)も受け付け、不正な項目は未設定とする。 */
export function readClearCondition(value: unknown, chartCount: number): ClearCondition {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const perChartRaw = Array.isArray(record.perChart) ? record.perChart : [];
  const legacyScores = Array.isArray(record.minScores) ? record.minScores : [];

  const perChart = Array.from({ length: chartCount }, (_, index) => {
    const metrics = readMetrics(perChartRaw[index]);
    if (metrics.minScore === null) metrics.minScore = toLimit(legacyScores[index]);
    return metrics;
  });
  const total = readMetrics(record.total);
  if (total.minScore === null) total.minScore = toLimit(record.minTotalScore);
  return { perChart, total };
}
