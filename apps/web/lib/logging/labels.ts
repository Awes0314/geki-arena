import type { ActivityEventType } from "@/lib/logging/activity-log";
import type { OperationActionType } from "@/lib/logging/operation-log";

export const ACTIVITY_EVENT_LABELS: Record<ActivityEventType, string> = {
  login: "ログイン",
  login_failed: "ログイン失敗",
  logout: "ログアウト",
  register: "ユーザー登録",
  competition_create: "大会作成",
  one_v_one_create: "1v1作成",
  score_submit: "スコア提出",
  score_submit_rejected: "スコア提出(却下)",
  error: "エラー",
};

export const OPERATION_ACTION_LABELS: Record<OperationActionType, string> = {
  user_suspend: "アカウント停止",
  user_unsuspend: "アカウント停止解除",
  report_resolve: "通報対応済み",
  score_delete: "スコア削除",
  competition_delete: "大会削除",
  one_v_one_delete: "1v1削除",
  participant_remove: "参加取消",
  course_create: "コース作成",
  course_update: "コース更新",
  course_delete: "コース削除",
  announcement_create: "お知らせ作成",
  master_sync: "マスタ更新",
};
