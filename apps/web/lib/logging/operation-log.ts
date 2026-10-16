import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export const OPERATION_ACTION_TYPES = [
  "user_suspend",
  "user_unsuspend",
  "report_resolve",
  "score_delete",
  "competition_delete",
  "one_v_one_delete",
  "participant_remove",
  "course_create",
  "course_update",
  "course_delete",
  "announcement_create",
  "master_sync",
] as const;

export type OperationActionType = (typeof OPERATION_ACTION_TYPES)[number];

type OperationLogInput = {
  operatorId: string;
  actionType: OperationActionType;
  targetType: string;
  targetId: string;
  /** 個人情報・認証情報を含めないこと。 */
  detail?: Record<string, Json>;
};

/** 運営操作ログを記録する。監査目的のため、失敗時は例外を投げて呼び出し側に伝える。 */
export async function recordOperation(input: OperationLogInput): Promise<void> {
  const { error } = await createAdminClient()
    .from("operation_logs")
    .insert({
      operator_id: input.operatorId,
      action_type: input.actionType,
      target_type: input.targetType,
      target_id: input.targetId,
      detail: input.detail ?? {},
    });
  if (error) throw new Error(`operation log insert failed: ${error.message}`);
}
