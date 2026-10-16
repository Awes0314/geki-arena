import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export const ADMIN_LOG_PAGE_SIZE = 30;

type UserRef = { user_no: number; display_name: string };
export type LogUser = { userNo: number; displayName: string };

export type ActivityLogItem = {
  id: string;
  eventType: string;
  level: string;
  createdAt: string;
  user: LogUser | null;
  detail: Json;
};

export type OperationLogItem = {
  id: string;
  actionType: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  operator: LogUser | null;
  detail: Json;
};

const toUser = (user: UserRef | null): LogUser | null =>
  user ? { userNo: user.user_no, displayName: user.display_name } : null;

type ActivityRow = {
  id: string;
  event_type: string;
  level: string;
  created_at: string;
  detail: Json;
  user: UserRef | null;
};

type OperationRow = {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  created_at: string;
  detail: Json;
  operator: UserRef | null;
};

/** 行動ログを新しい順に取得する（ページ番号は1始まり）。 */
export async function listActivityLogs(
  eventType: string | null,
  page: number,
): Promise<{ items: ActivityLogItem[]; total: number }> {
  const from = (page - 1) * ADMIN_LOG_PAGE_SIZE;
  let query = createAdminClient()
    .from("activity_logs")
    .select("id, event_type, level, created_at, detail, user:users!activity_logs_user_id_fkey(user_no, display_name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_LOG_PAGE_SIZE - 1);
  if (eventType) query = query.eq("event_type", eventType);

  const { data, count, error } = await query.overrideTypes<ActivityRow[], { merge: false }>();
  if (error) throw new Error(`failed to fetch activity logs: ${error.message}`);
  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      level: row.level,
      createdAt: row.created_at,
      user: toUser(row.user),
      detail: row.detail,
    })),
    total: count ?? 0,
  };
}

/** 運営操作ログを新しい順に取得する（ページ番号は1始まり）。 */
export async function listOperationLogs(
  actionType: string | null,
  page: number,
): Promise<{ items: OperationLogItem[]; total: number }> {
  const from = (page - 1) * ADMIN_LOG_PAGE_SIZE;
  let query = createAdminClient()
    .from("operation_logs")
    .select(
      "id, action_type, target_type, target_id, created_at, detail, operator:users!operation_logs_operator_id_fkey(user_no, display_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_LOG_PAGE_SIZE - 1);
  if (actionType) query = query.eq("action_type", actionType);

  const { data, count, error } = await query.overrideTypes<OperationRow[], { merge: false }>();
  if (error) throw new Error(`failed to fetch operation logs: ${error.message}`);
  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      actionType: row.action_type,
      targetType: row.target_type,
      targetId: row.target_id,
      createdAt: row.created_at,
      operator: toUser(row.operator),
      detail: row.detail,
    })),
    total: count ?? 0,
  };
}
