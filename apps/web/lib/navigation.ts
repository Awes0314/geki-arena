export type NavItem = { label: string; href: string };

type NavUser = { userNo: number; role: "general" | "admin" | string };

type NavDefinition = {
  label: string;
  href: (user: NavUser | null) => string;
  /** 表示条件（未指定は常に表示） */
  visible?: (user: NavUser | null) => boolean;
};

// 画面の追加時はここに項目を足す（認証状態・roleで出し分け）
const NAV_DEFINITIONS: NavDefinition[] = [
  { label: "ホーム", href: () => "/" },
  { label: "プロフィール", href: (user) => `/users/${user?.userNo}`, visible: (user) => user !== null },
];

export function getNavItems(user: NavUser | null): NavItem[] {
  return NAV_DEFINITIONS.filter((item) => item.visible?.(user) ?? true).map((item) => ({
    label: item.label,
    href: item.href(user),
  }));
}
