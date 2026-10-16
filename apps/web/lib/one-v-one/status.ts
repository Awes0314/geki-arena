/** 成立済みの対戦期間（成立日から14日後の日本時間23:59まで）。 */
export const MATCH_DURATION_DAYS = 14;
/** 成立前の募集・承認待ちの有効期間。 */
export const RECRUITMENT_EXPIRY_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type StoredMatchStatus = "recruiting" | "pending_acceptance" | "established" | "deleted";
export type OneVOneStatus = "recruiting" | "pending_acceptance" | "established" | "finished" | "expired";

export const ONE_V_ONE_STATUS_LABELS: Record<OneVOneStatus, string> = {
  recruiting: "募集中",
  pending_acceptance: "承認待ち",
  established: "対戦中",
  finished: "終了",
  expired: "期限切れ",
};

/** 成立時刻から終了日時（14日後の日本時間23:59）を算出する。 */
export function computeEndAt(startAt: Date): Date {
  const jst = new Date(startAt.getTime() + JST_OFFSET_MS);
  const endJst = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + MATCH_DURATION_DAYS, 23, 59);
  return new Date(endJst - JST_OFFSET_MS);
}

/** 募集・承認待ちの有効期限（作成から14日）。 */
export function getRecruitmentDeadline(createdAt: string | Date): Date {
  return new Date(new Date(createdAt).getTime() + RECRUITMENT_EXPIRY_DAYS * DAY_MS);
}

/** 保存済みの状態と日時から、表示用の状態を導出する。削除済みはnull。 */
export function getMatchStatus(
  match: { status: StoredMatchStatus; createdAt: string; endAt: string | null },
  now: Date,
): OneVOneStatus | null {
  if (match.status === "deleted") return null;
  if (match.status === "established") {
    return match.endAt !== null && now >= new Date(match.endAt) ? "finished" : "established";
  }
  return now >= getRecruitmentDeadline(match.createdAt) ? "expired" : match.status;
}

export type MatchOutcome = "creator_win" | "opponent_win" | "draw";

/** 勝敗を判定する。未提出（null）は提出済みの側の勝ち、両者未提出・同点は引き分け。 */
export function decideOutcome(creatorScore: number | null, opponentScore: number | null): MatchOutcome {
  if (creatorScore === null && opponentScore === null) return "draw";
  if (opponentScore === null) return "creator_win";
  if (creatorScore === null) return "opponent_win";
  if (creatorScore === opponentScore) return "draw";
  return creatorScore > opponentScore ? "creator_win" : "opponent_win";
}
