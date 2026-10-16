import { checkParticipationCondition, type ParticipationCheck } from "@/lib/competition/participation";
import { createAdminClient } from "@/lib/supabase/admin";

type RatingRangeIds = { minId: number | null; maxId: number | null };

async function fetchSortOrders(ids: number[]): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();
  const admin = createAdminClient();
  const { data, error } = await admin.from("rating_classes").select("id, sort_order").in("id", ids);
  if (error) throw new Error(`failed to fetch rating classes: ${error.message}`);
  return new Map(data.map((rating) => [rating.id, rating.sort_order]));
}

/** Rating区分範囲（大会の参加条件・1v1の募集範囲）の入力を検証する。問題があればフィールド名 -> メッセージ。 */
export async function validateRatingRange({ minId, maxId }: RatingRangeIds): Promise<Record<string, string> | null> {
  const ids = [minId, maxId].filter((id): id is number => id !== null);
  const orders = await fetchSortOrders(ids);
  if (orders.size !== new Set(ids).size) return { ratingMinId: "存在しないRating区分です" };

  const min = minId === null ? null : (orders.get(minId) ?? null);
  const max = maxId === null ? null : (orders.get(maxId) ?? null);
  if (min !== null && max !== null && min > max) {
    return { ratingMaxId: "上限は下限以上のRating区分を指定してください" };
  }
  return null;
}

/** ユーザーのRating区分が範囲を満たすか確認する。 */
export async function checkUserRatingCondition(userId: string, range: RatingRangeIds): Promise<ParticipationCheck> {
  const admin = createAdminClient();
  const { data: profile, error } = await admin.from("users").select("rating_class_id").eq("id", userId).single();
  if (error) throw new Error(`failed to fetch user rating: ${error.message}`);

  const ids = [profile.rating_class_id, range.minId, range.maxId].filter((id): id is number => id !== null);
  const orders = await fetchSortOrders(ids);
  const orderOf = (id: number | null) => (id === null ? null : (orders.get(id) ?? null));
  return checkParticipationCondition(orderOf(profile.rating_class_id), {
    min: orderOf(range.minId),
    max: orderOf(range.maxId),
  });
}
