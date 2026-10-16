"use client";

import { useActionState } from "react";

import { ChartDisplay } from "@/components/chart/ChartDisplay";
import { ChartPicker } from "@/components/competition/ChartPicker";
import { Alert } from "@/components/ui/Alert";
import { SelectInput, TextInput } from "@/components/ui/Fields";
import { FormSection as Section } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/actions/result";
import { createCourse, updateCourse } from "@/lib/admin/course-actions";
import type { ChartSearchResult } from "@/lib/competition/chart-search";
import { BADGE_CHAPTERS, BADGE_STYLES } from "@/lib/course-badge";
import { METRIC_DEFS, METRIC_KEYS, type ClearCondition, type ConditionMetrics } from "@/lib/course-condition";
import { COURSE_NAME_MAX_LENGTH, MAX_COURSE_CHARTS, MIN_COURSE_CHARTS } from "@/lib/validation/course";

type CourseFormProps = {
  /** 編集時のみ指定する */
  courseId?: string;
  defaults?: {
    courseName: string;
    chapter: string;
    badgeChapter: string;
    clearCondition: ClearCondition;
    charts: ChartSearchResult[];
  };
  /** trueの場合、譜面構成は変更できない（挑戦結果があるコース） */
  chartsLocked?: boolean;
};

const CHART_RULES = [
  `${MIN_COURSE_CHARTS}曲以上、${MAX_COURSE_CHARTS}曲以内（並び順は表示順です）`,
  "同一譜面の重複指定は不可",
];

/** 合格条件の入力欄一式。prefixはperChart（曲個別）またはtotal（通し）。 */
function MetricInputs({
  prefix,
  label,
  defaults,
}: {
  prefix: "perChart" | "total";
  label: string;
  defaults: ConditionMetrics | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {METRIC_KEYS.map((key) => (
        <label key={key} className="flex flex-col gap-1 text-xs">
          <span>{METRIC_DEFS[key].label}</span>
          <input
            name={`${prefix}_${key}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={METRIC_DEFS[key].max(prefix)}
            defaultValue={defaults?.[key] ?? ""}
            placeholder="未設定"
            title={METRIC_DEFS[key].hint}
            aria-label={`${label}: ${METRIC_DEFS[key].label}`}
            className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
        </label>
      ))}
    </div>
  );
}

/** コース作成・編集フォーム。クリア条件は設定した項目をすべて満たすと合格。 */
export function CourseForm({ courseId, defaults, chartsLocked = false }: CourseFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(courseId ? updateCourse : createCourse, null);
  const error = state?.result.ok === false ? state.result.error : null;
  const errors = error?.fieldErrors ?? {};
  const values = state?.values;

  const initialCharts = defaults?.charts ?? [];
  const metricsByChart = new Map(
    initialCharts.map((chart, index) => [chart.chartId, defaults?.clearCondition.perChart[index]]),
  );
  const chartInputs = (chart: ChartSearchResult) => (
    <MetricInputs prefix="perChart" label={chart.title} defaults={metricsByChart.get(chart.chartId)} />
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {courseId && <input type="hidden" name="courseId" value={courseId} />}
      {error && !error.fieldErrors && <Alert variant="error">{error.message}</Alert>}
      {error?.fieldErrors && <Alert variant="error">入力内容に誤りがあります。各項目をご確認ください。</Alert>}
      {state?.result.ok && <Alert variant="success">保存しました</Alert>}

      <Section title="基本情報">
        <TextInput
          label="コース名"
          name="courseName"
          required
          limits={[`${COURSE_NAME_MAX_LENGTH}文字以内`]}
          maxLength={COURSE_NAME_MAX_LENGTH}
          defaultValue={values?.courseName ?? defaults?.courseName}
          error={errors.courseName}
        />
        <TextInput
          label="チャプター"
          name="chapter"
          required
          limits={["1〜99の数字、または1文字の記号(α、β等)", "数字の小さい順、その後に記号の順で並びます"]}
          maxLength={2}
          defaultValue={values?.chapter ?? defaults?.chapter}
          error={errors.chapter}
        />
        <SelectInput
          label="クリア報酬バッジ"
          name="badgeChapter"
          required
          limits={["バッジの色・文字はチャプター番号とは独立して選べます"]}
          defaultValue={values?.badgeChapter ?? defaults?.badgeChapter ?? "1"}
          error={errors.badgeChapter}
        >
          {BADGE_CHAPTERS.map((chapter) => (
            <option key={chapter} value={chapter}>
              {BADGE_STYLES[chapter].glyph}
            </option>
          ))}
        </SelectInput>
      </Section>

      <Section title="譜面とクリア条件">
        <p className="text-xs text-muted">
          空欄は未設定です。曲ごと・通しのうち設定した条件をすべて満たすと合格です。個数の条件は「xx個以下」です。
        </p>
        {chartsLocked ? (
          <>
            <Alert variant="info">挑戦結果があるため、譜面構成は変更できません。クリア条件のみ編集できます。</Alert>
            <input type="hidden" name="chartIds" value={initialCharts.map((chart) => chart.chartId).join(",")} />
            <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {initialCharts.map((chart, index) => (
                <li key={chart.chartId} className="flex flex-col gap-2 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-muted">{index + 1}.</span>
                    <ChartDisplay
                      title={chart.title}
                      difficulty={chart.difficulty}
                      level={chart.level}
                      chartConstant={chart.chartConstant}
                    />
                  </div>
                  {chartInputs(chart)}
                </li>
              ))}
            </ol>
            {errors.perChart && <p className="text-xs text-red-600">{errors.perChart}</p>}
          </>
        ) : (
          <ChartPicker
            label="コースの譜面"
            max={MAX_COURSE_CHARTS}
            rules={CHART_RULES}
            initialSelected={initialCharts}
            renderExtra={chartInputs}
            error={errors.chartIds ?? errors.perChart}
          />
        )}
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <h3 className="text-sm font-medium">通しの条件（全曲の合計）</h3>
          <MetricInputs prefix="total" label="通し" defaults={defaults?.clearCondition.total} />
          {errors.total && <p className="text-xs text-red-600">{errors.total}</p>}
        </div>
      </Section>

      <SubmitButton pendingLabel="保存中...">{courseId ? "保存する" : "コースを作成する"}</SubmitButton>
    </form>
  );
}
