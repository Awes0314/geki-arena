import { z } from "zod";

import { LEVEL_OPTIONS, levelToNumber } from "@/lib/competition/level";
import {
  CHART_CONSTANT_MAX,
  CHART_CONSTANT_MIN,
  MUSIC_RANGE_TYPES,
  type MusicRange,
} from "@/lib/one-v-one/music-range";

const uuid = z.string().uuid();
const optionalId = z.string().regex(/^\d*$/, "不正な値です");

export type OneVOneInput = {
  creatorChartId: string;
  range: MusicRange;
  /** 対戦相手を指定する場合のユーザーID（指定なしは募集） */
  opponentUserId: string | null;
  ratingMinId: number | null;
  ratingMaxId: number | null;
};

export type OneVOneParseResult =
  | { ok: true; data: OneVOneInput }
  | { ok: false; fieldErrors: Record<string, string> };

/** 楽曲範囲の下限/上限の入力値を数値に変換する。不正な場合はnull。 */
function parseRangeValue(type: MusicRange["type"], value: string): number | null {
  if (type === "level") return LEVEL_OPTIONS.includes(value) ? levelToNumber(value) : null;
  if (!/^\d+(\.\d)?$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= CHART_CONSTANT_MIN && parsed <= CHART_CONSTANT_MAX ? parsed : null;
}

/** 楽曲範囲の入力を検証する。 */
export function parseMusicRange(
  values: Record<string, string>,
): { ok: true; range: MusicRange } | { ok: false; fieldErrors: Record<string, string> } {
  const type = MUSIC_RANGE_TYPES.find((item) => item === values.rangeType);
  if (!type) return { ok: false, fieldErrors: { rangeType: "範囲の種別を選択してください" } };

  const min = parseRangeValue(type, values.rangeMin ?? "");
  const max = parseRangeValue(type, values.rangeMax ?? "");
  const fieldErrors: Record<string, string> = {};
  if (min === null) fieldErrors.rangeMin = "下限を指定してください";
  if (max === null) fieldErrors.rangeMax = "上限を指定してください";
  if (min !== null && max !== null && min > max) fieldErrors.rangeMax = "上限は下限以上にしてください";
  if (min === null || max === null || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, range: { type, min, max } };
}

/** 1v1作成フォームの入力を検証する。 */
export function parseOneVOneForm(values: Record<string, string>): OneVOneParseResult {
  const fieldErrors: Record<string, string> = {};

  if (!uuid.safeParse(values.creatorChartId).success) fieldErrors.creatorChartId = "自選楽曲を選択してください";

  const range = parseMusicRange(values);
  if (!range.ok) Object.assign(fieldErrors, range.fieldErrors);

  const hasOpponent = values.hasOpponent === "on";
  if (hasOpponent && !uuid.safeParse(values.opponentUserId).success) {
    fieldErrors.opponentUserId = "対戦相手を選択してください";
  }

  const ratingMin = optionalId.safeParse(values.ratingMinId ?? "");
  const ratingMax = optionalId.safeParse(values.ratingMaxId ?? "");
  if (!ratingMin.success) fieldErrors.ratingMinId = ratingMin.error.issues[0].message;
  if (!ratingMax.success) fieldErrors.ratingMaxId = ratingMax.error.issues[0].message;

  if (!range.ok || !ratingMin.success || !ratingMax.success || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: {
      creatorChartId: values.creatorChartId,
      range: range.range,
      opponentUserId: hasOpponent ? values.opponentUserId : null,
      // Rating区分範囲は募集（対戦相手の指定なし）のときのみ有効
      ratingMinId: hasOpponent || ratingMin.data === "" ? null : Number(ratingMin.data),
      ratingMaxId: hasOpponent || ratingMax.data === "" ? null : Number(ratingMax.data),
    },
  };
}
