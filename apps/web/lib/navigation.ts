import type { ModeTone } from "@/lib/mode-tone";

export type NavItem = { label: string; href: string; /** モードのイメージカラー（大会=赤、1v1=緑） */ tone?: ModeTone };

type NavUser = { userNo: number; role: "general" | "admin" | string };

type NavDefinition = {
  label: string;
  href: (user: NavUser | null) => string;
  tone?: NavItem["tone"];
  /** 表示条件（未指定は常に表示） */
  visible?: (user: NavUser | null) => boolean;
};

// 画面の追加時はここに項目を足す（認証状態・roleで出し分け）
const NAV_DEFINITIONS: NavDefinition[] = [
  { label: "ホーム", href: () => "/" },
  { label: "大会", href: () => "/competitions", tone: "competition", visible: (user) => user !== null },
  { label: "1v1", href: () => "/one-v-one", tone: "one-v-one", visible: (user) => user !== null },
  { label: "プロフィール", href: (user) => `/users/${user?.userNo}`, visible: (user) => user !== null },
  { label: "スコア提出", href: () => "/bookmarklet", visible: (user) => user !== null },
  { label: "運営", href: () => "/admin", visible: (user) => user?.role === "admin" },
];

export function getNavItems(user: NavUser | null): NavItem[] {
  return NAV_DEFINITIONS.filter((item) => item.visible?.(user) ?? true).map((item) => ({
    label: item.label,
    href: item.href(user),
    tone: item.tone,
  }));
}
