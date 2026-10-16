import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

export const ADMIN_USER_PAGE_SIZE = 20;

export const USER_STATUSES = ["active", "suspended", "deleted"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export function isUserStatus(value: string): value is UserStatus {
  return (USER_STATUSES as readonly string[]).includes(value);
}

export type AdminUser = Pick<
  Tables<"users">,
  "id" | "user_no" | "user_id" | "display_name" | "icon_url" | "role" | "status" | "created_at"
>;

export type AdminReport = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { userNo: number; displayName: string } | null;
  reported: { userNo: number; displayName: string } | null;
};

const USER_COLUMNS = "id, user_no, user_id, display_name, icon_url, role, status, created_at";

function sanitizeKeyword(keyword: string): string {
  return keyword.replace(/[%_\\,()]/g, " ").trim();
}

/** user_id・表示名の部分一致、またはユーザーNo完全一致で検索する（ページ番号は1始まり）。 */
export async function listAdminUsers(
  keyword: string,
  status: UserStatus | null,
  page: number,
): Promise<{ items: AdminUser[]; total: number }> {
  const from = (page - 1) * ADMIN_USER_PAGE_SIZE;
  let query = createAdminClient()
    .from("users")
    .select(USER_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_USER_PAGE_SIZE - 1);

  const safe = sanitizeKeyword(keyword);
  if (safe) {
    const conditions = [`user_id.ilike.%${safe}%`, `display_name.ilike.%${safe}%`];
    if (/^\d{1,15}$/.test(safe)) conditions.push(`user_no.eq.${safe}`);
    query = query.or(conditions.join(","));
  }
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) throw new Error(`failed to fetch users: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export async function getAdminUserByUserNo(userNo: number): Promise<AdminUser | null> {
  const { data, error } = await createAdminClient()
    .from("users")
    .select(USER_COLUMNS)
    .eq("user_no", userNo)
    .maybeSingle();
  if (error) throw new Error(`failed to fetch user: ${error.message}`);
  return data;
}

type ReportRow = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { user_no: number; display_name: string } | null;
  reported: { user_no: number; display_name: string } | null;
};

/** 通報を新しい順に取得する。 */
export async function listReports(options: {
  status?: "open" | "resolved";
  reportedUserId?: string;
  limit: number;
}): Promise<AdminReport[]> {
  let query = createAdminClient()
    .from("reports")
    .select(
      "id, reason, status, created_at, reporter:users!reports_reporter_id_fkey(user_no, display_name), reported:users!reports_reported_user_id_fkey(user_no, display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(options.limit);
  if (options.status) query = query.eq("status", options.status);
  if (options.reportedUserId) query = query.eq("reported_user_id", options.reportedUserId);

  const { data, error } = await query.overrideTypes<ReportRow[], { merge: false }>();
  if (error) throw new Error(`failed to fetch reports: ${error.message}`);

  const toUser = (user: ReportRow["reporter"]) =>
    user ? { userNo: user.user_no, displayName: user.display_name } : null;
  return (data ?? []).map((row) => ({
    id: row.id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    reporter: toUser(row.reporter),
    reported: toUser(row.reported),
  }));
}

/** 対象ユーザーの直近の行動ログを取得する。 */
export async function listUserActivity(userId: string, limit: number) {
  const { data, error } = await createAdminClient()
    .from("activity_logs")
    .select("id, event_type, level, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`failed to fetch activity: ${error.message}`);
  return data ?? [];
}
