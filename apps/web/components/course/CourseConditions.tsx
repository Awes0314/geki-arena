import { ChartDisplay } from "@/components/chart/ChartDisplay";
import { METRIC_DEFS, METRIC_KEYS, type ClearCondition, type ConditionMetrics } from "@/lib/course-condition";
import type { CourseChart, MyCourseResult } from "@/lib/course/queries";

const STATUS = {
  none: { label: "未挑戦", className: "border-border text-muted" },
  failed: { label: "失敗", className: "border-red-500 text-red-500" },
  cleared: { label: "クリア", className: "border-emerald-500 text-emerald-500" },
} as const;

/** 自身の挑戦状況バッジ。 */
export function CourseStatusBadge({ result }: { result: MyCourseResult }) {
  const status = STATUS[result?.result ?? "none"];
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-bold ${status.className}`}>
      {status.label}
    </span>
  );
}

function MetricList({ metrics }: { metrics: ConditionMetrics }) {
  const entries = METRIC_KEYS.flatMap((key) => (metrics[key] === null ? [] : [[key, metrics[key]] as const]));
  if (entries.length === 0) return <span className="text-muted">条件なし</span>;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {entries.map(([key, value]) => (
        <li key={key}>
          {METRIC_DEFS[key].label}: {value.toLocaleString("ja-JP")}
        </li>
      ))}
    </ul>
  );
}

/** 課題曲ごとのクリア条件と、通しの条件を一覧表示する。 */
export function CourseConditions({ charts, condition }: { charts: CourseChart[]; condition: ClearCondition }) {
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col divide-y divide-border">
        {charts.map((chart, index) => (
          <li key={chart.chartId} className="flex flex-col gap-1 py-2 text-xs">
            <span className="flex items-center gap-2">
              <span className="w-5 text-muted">{index + 1}.</span>
              <ChartDisplay
                title={chart.title}
                difficulty={chart.difficulty}
                level={chart.level}
                chartConstant={chart.chartConstant}
              />
            </span>
            <span className="pl-7">
              <MetricList metrics={condition.perChart[index]} />
            </span>
          </li>
        ))}
      </ol>
      <div className="text-xs">
        <p className="mb-1 font-semibold">通し（全曲合計）</p>
        <MetricList metrics={condition.total} />
      </div>
    </div>
  );
}
