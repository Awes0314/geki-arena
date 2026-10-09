import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type CurrentUser = Pick<
  Tables<"users">,
  "id" | "user_no" | "user_id" | "display_name" | "icon_url" | "role" | "status"
>;

/** ログイン中のユーザー（未ログイン・停止/削除済みはnull）。リクエスト内でキャッシュされる。 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, user_no, user_id, display_name, icon_url, role, status")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile || profile.status !== "active") return null;
  return profile;
});

/** 未ログインの場合はログイン画面へリダイレクトする。 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
