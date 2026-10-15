/** 参加可否の判定に使うRating区分の並び順（sort_order）。未設定はnull。 */
export type RatingRange = { min: number | null; max: number | null };

export type ParticipationCheck = { ok: true } | { ok: false; reason: string };

/** 参加条件（Rating区分の上限・下限）を満たすか判定する。条件があるのに区分が未設定の場合は参加不可。 */
export function checkParticipationCondition(userRatingOrder: number | null, range: RatingRange): ParticipationCheck {
  if (range.min === null && range.max === null) return { ok: true };
  if (userRatingOrder === null) {
    return { ok: false, reason: "参加条件があるため、プロフィールでRating区分を設定してください。" };
  }
  if (range.min !== null && userRatingOrder < range.min) {
    return { ok: false, reason: "Rating区分が参加条件の下限に達していません。" };
  }
  if (range.max !== null && userRatingOrder > range.max) {
    return { ok: false, reason: "Rating区分が参加条件の上限を超えています。" };
  }
  return { ok: true };
}
