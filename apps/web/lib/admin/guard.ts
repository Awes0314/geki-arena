import "server-only";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";

/** 運営操作の入口で権限を確認する。未ログイン・一般ユーザーはnull。 */
export async function getAdminUser(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
