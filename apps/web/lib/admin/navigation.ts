export type AdminNavItem = { label: string; href: string };

// 運営ページの追加時はここに項目を足す
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "ダッシュボード", href: "/admin" },
  { label: "ユーザー", href: "/admin/users" },
  { label: "大会", href: "/admin/competitions" },
  { label: "1v1", href: "/admin/one-v-one" },
  { label: "提出", href: "/admin/submissions" },
  { label: "コース", href: "/admin/courses" },
  { label: "ログ", href: "/admin/logs" },
  { label: "デザイン", href: "/admin/design" },
  { label: "マスタ", href: "/admin/master" },
];
