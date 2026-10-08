import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/** RLSをバイパスするクライアント。運営機能・ユーザー登録など特権操作に限定して使用する。 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
