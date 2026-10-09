import { createClient } from "@/lib/supabase/server";
import { parseSnsLinks, type SnsLink } from "@/lib/validation/profile";

export type RatingClassData = { id: number; code: string; label: string };
export type CourseBadgeData = { id: string; svgUrl: string; courseName: string };

export type UserProfile = {
  id: string;
  userNo: number;
  userId: string;
  displayName: string;
  iconUrl: string | null;
  bio: string | null;
  snsLinks: SnsLink[];
  ratingClass: RatingClassData | null;
  ratingClassId: number | null;
  displayedBadge: CourseBadgeData | null;
  displayedBadgeId: string | null;
};

type BadgeRow = {
  id: string;
  svg_asset_url: string;
  courses: { course_name: string } | null;
};

const BADGE_SELECT = "id, svg_asset_url, courses!course_badges_course_id_fkey(course_name)";

function toBadgeData(row: BadgeRow): CourseBadgeData {
  return { id: row.id, svgUrl: row.svg_asset_url, courseName: row.courses?.course_name ?? "" };
}

/** userNoでプロフィールを取得する。存在しない・削除済みの場合はnull。 */
export async function getProfileByUserNo(userNo: number): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      `id, user_no, user_id, display_name, icon_url, bio, sns_links, status, rating_class_id, displayed_badge_id,
       rating_classes(id, code, label),
       course_badges!users_displayed_badge_id_fkey(${BADGE_SELECT})`,
    )
    .eq("user_no", userNo)
    .maybeSingle();

  if (error) throw new Error(`failed to fetch profile: ${error.message}`);
  if (!data || data.status === "deleted") return null;

  return {
    id: data.id,
    userNo: data.user_no,
    userId: data.user_id,
    displayName: data.display_name,
    iconUrl: data.icon_url,
    bio: data.bio,
    snsLinks: parseSnsLinks(data.sns_links),
    ratingClass: data.rating_classes,
    ratingClassId: data.rating_class_id,
    displayedBadge: data.course_badges ? toBadgeData(data.course_badges as BadgeRow) : null,
    displayedBadgeId: data.displayed_badge_id,
  };
}

/** Rating区分マスタを並び順で取得する。 */
export async function getRatingClasses(): Promise<RatingClassData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rating_classes")
    .select("id, code, label")
    .order("sort_order");
  if (error) throw new Error(`failed to fetch rating classes: ${error.message}`);
  return data;
}

/** ユーザーがクリア済みのコースのバッジ一覧を取得する。 */
export async function getClearedBadges(userId: string): Promise<CourseBadgeData[]> {
  const supabase = await createClient();
  const { data: results, error } = await supabase
    .from("course_challenge_results")
    .select("course_id")
    .eq("user_id", userId)
    .eq("result", "cleared");
  if (error) throw new Error(`failed to fetch course results: ${error.message}`);
  if (results.length === 0) return [];

  const { data: badges, error: badgeError } = await supabase
    .from("course_badges")
    .select(BADGE_SELECT)
    .in(
      "course_id",
      results.map((row) => row.course_id),
    );
  if (badgeError) throw new Error(`failed to fetch badges: ${badgeError.message}`);
  return (badges as BadgeRow[]).map(toBadgeData);
}
