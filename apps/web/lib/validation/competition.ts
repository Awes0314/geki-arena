import { z } from "zod";

import { parseJstDateTime, validatePeriod } from "@/lib/competition/period";

export const COMPETITION_NAME_MAX_LENGTH = 50;
export const COMPETITION_DESCRIPTION_MAX_LENGTH = 1000;
export const MIN_TARGET_CHARTS = 1;
export const MAX_TARGET_CHARTS = 10;

const optionalId = z.string().regex(/^\d*$/, "不正な値です");

const competitionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "大会名を入力してください")
    .max(COMPETITION_NAME_MAX_LENGTH, `大会名は${COMPETITION_NAME_MAX_LENGTH}文字以内で入力してください`),
  description: z
    .string()
    .trim()
    .max(COMPETITION_DESCRIPTION_MAX_LENGTH, `説明は${COMPETITION_DESCRIPTION_MAX_LENGTH}文字以内で入力してください`),
  startAt: z.string(),
  endAt: z.string(),
  ratingMinId: optionalId,
  ratingMaxId: optionalId,
  chartIds: z.string(),
});

export const competitionDescriptionSchema = competitionFormSchema.shape.description;

export type CompetitionInput = {
  name: string;
  description: string;
  startAt: Date;
  endAt: Date;
  ratingMinId: number | null;
  ratingMaxId: number | null;
  continuousPlayRequired: boolean;
  chartIds: string[];
};

export type CompetitionParseResult =
  | { ok: true; data: CompetitionInput }
  | { ok: false; fieldErrors: Record<string, string> };

/** 大会作成フォームの入力を検証する（chartIdsはカンマ区切りの譜面ID、順序が課題曲の順）。 */
export function parseCompetitionForm(values: Record<string, string>, now: Date): CompetitionParseResult {
  const parsed = competitionFormSchema.safeParse({
    name: values.name ?? "",
    description: values.description ?? "",
    startAt: values.startAt ?? "",
    endAt: values.endAt ?? "",
    ratingMinId: values.ratingMinId ?? "",
    ratingMaxId: values.ratingMaxId ?? "",
    chartIds: values.chartIds ?? "",
  });

  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
  }

  const startAt = parseJstDateTime(values.startAt ?? "");
  const endAt = parseJstDateTime(values.endAt ?? "");
  Object.assign(fieldErrors, validatePeriod(startAt, endAt, now));

  const chartIds = (values.chartIds ?? "").split(",").filter((id) => id !== "");
  const uuid = z.string().uuid();
  if (chartIds.length < MIN_TARGET_CHARTS || chartIds.length > MAX_TARGET_CHARTS) {
    fieldErrors.chartIds = `課題曲は${MIN_TARGET_CHARTS}〜${MAX_TARGET_CHARTS}曲で指定してください`;
  } else if (!chartIds.every((id) => uuid.safeParse(id).success)) {
    fieldErrors.chartIds = "課題曲の指定が不正です";
  } else if (new Set(chartIds).size !== chartIds.length) {
    fieldErrors.chartIds = "同じ譜面を複数回指定することはできません";
  }

  if (!parsed.success || !startAt || !endAt || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      startAt,
      endAt,
      ratingMinId: parsed.data.ratingMinId === "" ? null : Number(parsed.data.ratingMinId),
      ratingMaxId: parsed.data.ratingMaxId === "" ? null : Number(parsed.data.ratingMaxId),
      continuousPlayRequired: values.continuousPlayRequired === "on",
      chartIds,
    },
  };
}
