import { z } from "zod";

import { isBadgeChapter, type BadgeChapter } from "@/lib/course-badge";
import { isValidChapter } from "@/lib/course-chapter";
import {
  emptyMetrics,
  METRIC_DEFS,
  METRIC_KEYS,
  type ClearCondition,
  type ConditionMetrics,
  type MetricKey,
} from "@/lib/course-condition";

export const COURSE_NAME_MAX_LENGTH = 50;
export const MIN_COURSE_CHARTS = 1;
export const MAX_COURSE_CHARTS = 10;

export type CourseInput = {
  courseName: string;
  chapter: string;
  badgeChapter: BadgeChapter;
  chartIds: string[];
  clearCondition: ClearCondition;
};

export type CourseParseResult =
  | { ok: true; data: CourseInput }
  | { ok: false; fieldErrors: Record<string, string> };

/** 曲個別の入力値。項目ごとに譜面順の文字列配列。 */
export type PerChartInputs = Partial<Record<MetricKey, string[]>>;

/** 空文字はnull、それ以外は0以上上限以下の整数。不正値はundefined。 */
function parseOptionalLimit(value: string, max: number): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!/^\d{1,9}$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return parsed <= max ? parsed : undefined;
}

/** 1範囲分の入力を解析する。不正な項目があればerrorMessageを返す。 */
function parseMetrics(
  read: (key: MetricKey) => string,
  scope: "perChart" | "total",
): { metrics: ConditionMetrics } | { error: string } {
  const metrics = emptyMetrics();
  for (const key of METRIC_KEYS) {
    const max = METRIC_DEFS[key].max(scope);
    const parsed = parseOptionalLimit(read(key), max);
    if (parsed === undefined) {
      return { error: `${METRIC_DEFS[key].label}は0〜${max.toLocaleString("ja-JP")}の整数で入力してください` };
    }
    metrics[key] = parsed;
  }
  return { metrics };
}

/**
 * コース作成・編集フォームを検証する。chartIdsはカンマ区切り（順序がコース内の順）。
 * 曲個別の条件はperChartInputs、通しの条件はvalues[`total_${key}`]から読む。
 */
export function parseCourseForm(values: Record<string, string>, perChartInputs: PerChartInputs): CourseParseResult {
  const fieldErrors: Record<string, string> = {};

  const courseName = (values.courseName ?? "").trim();
  if (courseName === "") fieldErrors.courseName = "コース名を入力してください";
  else if (courseName.length > COURSE_NAME_MAX_LENGTH) {
    fieldErrors.courseName = `コース名は${COURSE_NAME_MAX_LENGTH}文字以内で入力してください`;
  }

  const chapter = (values.chapter ?? "").trim();
  if (!isValidChapter(chapter)) {
    fieldErrors.chapter = "チャプターは1〜99の数字、または1文字の記号(α、β等)で入力してください";
  }

  const badgeChapter = values.badgeChapter ?? "";
  if (!isBadgeChapter(badgeChapter)) fieldErrors.badgeChapter = "バッジのチャプターを選択してください";

  const chartIds = (values.chartIds ?? "").split(",").filter((id) => id !== "");
  const uuid = z.string().uuid();
  if (chartIds.length < MIN_COURSE_CHARTS || chartIds.length > MAX_COURSE_CHARTS) {
    fieldErrors.chartIds = `譜面は${MIN_COURSE_CHARTS}〜${MAX_COURSE_CHARTS}曲で指定してください`;
  } else if (!chartIds.every((id) => uuid.safeParse(id).success)) {
    fieldErrors.chartIds = "譜面の指定が不正です";
  } else if (new Set(chartIds).size !== chartIds.length) {
    fieldErrors.chartIds = "同じ譜面を複数回指定することはできません";
  }

  const perChart: ConditionMetrics[] = [];
  for (let index = 0; index < chartIds.length; index++) {
    const result = parseMetrics((key) => perChartInputs[key]?.[index] ?? "", "perChart");
    if ("error" in result) {
      fieldErrors.perChart = `${index + 1}曲目: ${result.error}`;
      break;
    }
    perChart.push(result.metrics);
  }

  const totalResult = parseMetrics((key) => values[`total_${key}`] ?? "", "total");
  if ("error" in totalResult) fieldErrors.total = `通し: ${totalResult.error}`;

  if (Object.keys(fieldErrors).length > 0 || "error" in totalResult || !isBadgeChapter(badgeChapter)) {
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    data: {
      courseName,
      chapter,
      badgeChapter,
      chartIds,
      clearCondition: { perChart, total: totalResult.metrics },
    },
  };
}
