export type CompetitionStatus = "scheduled" | "ongoing" | "finished";

export const STATUS_LABELS: Record<CompetitionStatus, string> = {
  scheduled: "開催予定",
  ongoing: "開催中",
  finished: "終了",
};

export const MIN_DURATION_MS = 24 * 60 * 60 * 1000;
export const MAX_DURATION_MS = 90 * 24 * 60 * 60 * 1000;
export const TIME_STEP_MINUTES = 10;

const JST_OFFSET = "+09:00";

/** 開始・終了日時と現在時刻から開催状態を導出する（state-transitions.md）。 */
export function getCompetitionStatus(startAt: string | Date, endAt: string | Date, now: Date): CompetitionStatus {
  if (now < new Date(startAt)) return "scheduled";
  if (now < new Date(endAt)) return "ongoing";
  return "finished";
}

/** フォームのdatetime-local値（JST、例: 2026-10-12T20:30）をDateに変換する。不正値はnull。 */
export function parseJstDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00${JST_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 日時をJSTの「YYYY/MM/DD HH:mm」で表示する。 */
export function formatJstDateTime(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 日時をdatetime-local形式のJST値（YYYY-MM-DDTHH:mm）に変換する。 */
export function toJstInputValue(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

const DEFAULT_START_OFFSET_MS = 30 * 60 * 1000;
const DEFAULT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** 作成フォームの初期値。開始は「現在+30分」以降で最も近い10分刻み、終了はその7日後。 */
export function getDefaultPeriod(now: Date): { startAt: string; endAt: string } {
  const step = TIME_STEP_MINUTES * 60 * 1000;
  const start = new Date(Math.ceil((now.getTime() + DEFAULT_START_OFFSET_MS) / step) * step);
  return { startAt: toJstInputValue(start), endAt: toJstInputValue(new Date(start.getTime() + DEFAULT_DURATION_MS)) };
}

/** 開催期間の検証結果。問題があればフィールド名 -> メッセージ。 */
export function validatePeriod(start: Date | null, end: Date | null, now: Date): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!start) errors.startAt = "開始日時を入力してください";
  if (!end) errors.endAt = "終了日時を入力してください";
  if (!start || !end) return errors;

  if (start.getUTCMinutes() % TIME_STEP_MINUTES !== 0) errors.startAt = "10分単位で指定してください";
  if (end.getUTCMinutes() % TIME_STEP_MINUTES !== 0) errors.endAt = "10分単位で指定してください";
  if (!errors.startAt && start <= now) errors.startAt = "開始日時は現在より後にしてください";
  if (errors.endAt) return errors;

  const duration = end.getTime() - start.getTime();
  if (duration <= 0) errors.endAt = "終了日時は開始日時より後にしてください";
  else if (duration < MIN_DURATION_MS) errors.endAt = "開催期間は24時間以上にしてください";
  else if (duration > MAX_DURATION_MS) errors.endAt = "開催期間は90日以内にしてください";
  return errors;
}
