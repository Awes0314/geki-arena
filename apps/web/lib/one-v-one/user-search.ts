"use server";

import { z } from "zod";

import { fail, failInternal, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/utils";

export type UserSearchResult = {
  id: string;
  userNo: number;
  userId: string;
  displayName: string;
  iconUrl: string | null;
};

const RESULT_LIMIT = 10;
const querySchema = z.string().trim().min(1).max(50);

const SELECT = "id, user_no, user_id, display_name, icon_url";

/** 対戦相手の指定用に、ユーザーIDの完全一致または表示名の部分一致でユーザーを検索する（自分自身・停止/削除済みは除く）。 */
export async function searchUsers(input: string): Promise<ActionResult<UserSearchResult[]>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const parsed = querySchema.safeParse(input);
  if (!parsed.success) return ok([]);

  try {
    const supabase = await createClient();
    const [byUserId, byName] = await Promise.all([
      supabase.from("users").select(SELECT).eq("status", "active").eq("user_id", parsed.data).neq("id", user.id),
      supabase
        .from("users")
        .select(SELECT)
        .eq("status", "active")
        .ilike("display_name", `%${escapeLike(parsed.data)}%`)
        .neq("id", user.id)
        .limit(RESULT_LIMIT),
    ]);
    if (byUserId.error) throw new Error(byUserId.error.message);
    if (byName.error) throw new Error(byName.error.message);

    const merged = new Map([...byUserId.data, ...byName.data].map((row) => [row.id, row]));
    return ok(
      [...merged.values()].slice(0, RESULT_LIMIT).map((row) => ({
        id: row.id,
        userNo: row.user_no,
        userId: row.user_id,
        displayName: row.display_name,
        iconUrl: row.icon_url,
      })),
    );
  } catch (cause) {
    return failInternal("searchUsers", cause);
  }
}
