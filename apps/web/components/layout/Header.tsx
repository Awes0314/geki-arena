import Link from "next/link";

import { NavLinks } from "@/components/layout/NavLinks";
import { buttonStyles } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logout } from "@/lib/auth/actions";
import { getNavItems } from "@/lib/navigation";

/** 認証状態に応じてナビゲーションを切り替える。md以上はヘッダー、モバイルは下部ナビを使う。 */
export async function Header() {
  const user = await getCurrentUser();
  const items = getNavItems(user ? { userNo: user.user_no, role: user.role } : null);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Geki Arena
            </Link>
            <nav aria-label="メインナビゲーション" className="hidden md:block">
              <NavLinks items={items} variant="header" />
            </nav>
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <Link href={`/users/${user.user_no}`} aria-label="自分のプロフィール">
                <Avatar src={user.icon_url} name={user.display_name} size="sm" />
              </Link>
              <form action={logout}>
                <button type="submit" className={buttonStyles("ghost")}>
                  ログアウト
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className={buttonStyles("primary")}>
              ログイン
            </Link>
          )}
        </div>
      </header>
      <nav
        aria-label="モバイルナビゲーション"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface md:hidden"
      >
        <NavLinks items={items} variant="bottom" />
      </nav>
    </>
  );
}
