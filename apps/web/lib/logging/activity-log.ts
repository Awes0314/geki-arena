import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export const ACTIVITY_EVENT_TYPES = [
  "login",
  "login_failed",
  "logout",
  "register",
  "competition_create",
  "one_v_one_create",
  "score_submit",
  "score_submit_rejected",
  "error",
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

type ActivityLogInput = {
  eventType: ActivityEventType;
  userId?: string | null;
  level?: "info" | "error";
  /** 個人情報・認証情報を含めないこと。 */
  detail?: Record<string, Json>;
};

/** 行動ログを記録する。記録失敗は本処理に影響させない。 */
export async function recordActivity(input: ActivityLogInput): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("activity_logs")
      .insert({
        event_type: input.eventType,
        user_id: input.userId ?? null,
        level: input.level ?? "info",
        detail: input.detail ?? {},
      });
    if (error) console.error("[recordActivity]", error.message);
  } catch (cause) {
    console.error("[recordActivity]", cause instanceof Error ? cause.message : cause);
  }
}

const MAX_ERROR_MESSAGE_LENGTH = 300;

/** 想定外エラーをerrorイベントとして記録する。 */
export async function recordError(context: string, cause: unknown): Promise<void> {
  const message = cause instanceof Error ? cause.message : String(cause);
  await recordActivity({
    eventType: "error",
    level: "error",
    detail: { context, message: message.slice(0, MAX_ERROR_MESSAGE_LENGTH) },
  });
}
