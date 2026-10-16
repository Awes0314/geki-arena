import { emptyMetrics, METRIC_KEYS, type ClearCondition, type ConditionMetrics, type MetricKey } from "@/lib/course-condition";

/** 合否判定に用いる1曲分のプレイ結果。 */
export type JudgedSong = {
  technicalScore: number;
  /** プレイ履歴詳細から取得する値。一覧のみの提出ではnull */
  detail: { breakCount: number; hitCount: number; missCount: number; bellObtained: number; bellTotal: number; damage: number } | null;
};

export type MetricCheck = { key: MetricKey; limit: number; actual: number; passed: boolean };

export type JudgeResult = {
  passed: boolean;
  perChart: MetricCheck[][];
  total: MetricCheck[];
};

type Values = Record<MetricKey, number>;

function toValues(song: JudgedSong): Values {
  const detail = song.detail;
  return {
    minScore: song.technicalScore,
    maxBreakOrBelow: detail ? detail.breakCount + detail.hitCount + detail.missCount : 0,
    maxHitOrBelow: detail ? detail.hitCount + detail.missCount : 0,
    maxMiss: detail?.missCount ?? 0,
    maxBellMissed: detail ? detail.bellTotal - detail.bellObtained : 0,
    maxDamage: detail?.damage ?? 0,
  };
}

function sumValues(songs: JudgedSong[]): Values {
  const total = toValues({ technicalScore: 0, detail: null });
  for (const song of songs) {
    const values = toValues(song);
    for (const key of METRIC_KEYS) total[key] += values[key];
  }
  return total;
}

function check(metrics: ConditionMetrics, values: Values): MetricCheck[] {
  return METRIC_KEYS.flatMap((key): MetricCheck[] => {
    const limit = metrics[key];
    if (limit === null) return [];
    const actual = values[key];
    return [{ key, limit, actual, passed: key === "minScore" ? actual >= limit : actual <= limit }];
  });
}

/** 判定にプレイ履歴詳細が必要な条件（テクニカルスコア以外）が設定されているか。 */
export function requiresDetail(condition: ClearCondition): boolean {
  return [...condition.perChart, condition.total].some((metrics) =>
    METRIC_KEYS.some((key) => key !== "minScore" && metrics[key] !== null),
  );
}

/** コースの合否を判定する。songsは譜面順(order_index)で、条件のperChartと同じ並びであること。 */
export function judgeCourse(condition: ClearCondition, songs: JudgedSong[]): JudgeResult {
  const perChart = songs.map((song, index) => check(condition.perChart[index] ?? emptyMetrics(), toValues(song)));
  const total = check(condition.total, sumValues(songs));
  const passed = [...perChart.flat(), ...total].every((entry) => entry.passed);
  return { passed, perChart, total };
}
