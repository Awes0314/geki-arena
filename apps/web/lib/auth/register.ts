"use server";

import { fail, failInternal, ok, type FormState } from "@/lib/actions/result";
import { userIdToInternalEmail } from "@/lib/auth/internal-email";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/auth/recovery-code";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation/auth";
import { toFieldErrors } from "@/lib/validation/field-errors";

export type RegisterData = { recoveryCode: string };

const USER_ID_TAKEN = "このユーザーIDは既に使用されています";
const UNIQUE_VIOLATION = "23505";

/** ユーザー登録（authentication.md「Registration Flow」）。成功時は自動ログインし、リカバリーコードを1度だけ返す。 */
export async function register(
  _prevState: FormState<RegisterData>,
  formData: FormData,
): Promise<FormState<RegisterData>> {
  // パスワードは再表示しない
  const values = { userId: String(formData.get("userId") ?? "") };

  const parsed = registerSchema.safeParse({
    userId: values.userId,
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return { result: fail("VALIDATION_ERROR", "入力内容を確認してください", toFieldErrors(parsed.error)), values };
  }
  const { userId, password } = parsed.data;
  const conflict = { result: fail("CONFLICT", USER_ID_TAKEN, { userId: USER_ID_TAKEN }), values };

  let authUserId: string | null = null;
  const admin = createAdminClient();

  try {
    const { data: existing, error: lookupError } = await admin
      .from("users")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (lookupError) throw new Error(`user lookup failed: ${lookupError.message}`);
    if (existing) return conflict;

    const email = userIdToInternalEmail(userId);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      if (createError?.code === "email_exists") return conflict;
      throw new Error(`auth user creation failed: ${createError?.message}`);
    }
    authUserId = created.user.id;

    const recoveryCode = generateRecoveryCode();
    const { error: insertError } = await admin.from("users").insert({
      id: authUserId,
      user_id: userId,
      display_name: userId,
      recovery_code_hash: hashRecoveryCode(recoveryCode),
    });
    if (insertError) {
      await admin.auth.admin.deleteUser(authUserId);
      authUserId = null;
      if (insertError.code === UNIQUE_VIOLATION) return conflict;
      throw new Error(`profile creation failed: ${insertError.message}`);
    }

    // 自動ログイン。失敗しても登録自体は完了しているため、ログイン画面から入れる
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) console.error("[register] auto sign-in failed:", signInError.message);

    return { result: ok({ recoveryCode }), values };
  } catch (cause) {
    // プロフィール作成前に失敗した場合は孤立したAuthユーザーを残さない
    if (authUserId) await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
    return { result: failInternal("register", cause), values };
  }
}
