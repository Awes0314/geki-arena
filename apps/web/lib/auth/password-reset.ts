"use server";

import { timingSafeEqual } from "node:crypto";

import { fail, failInternal, ok, type FormState } from "@/lib/actions/result";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/auth/recovery-code";
import type { RegisterData } from "@/lib/auth/register";
import { createAdminClient } from "@/lib/supabase/admin";
import { passwordResetSchema } from "@/lib/validation/auth";
import { toFieldErrors } from "@/lib/validation/field-errors";

// ユーザーIDの存在有無を推測されないよう、失敗理由は区別しない
const INVALID_CREDENTIALS = "ユーザーIDまたはリカバリーコードが正しくありません";

function hashesMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/** リカバリーコードによるパスワード再設定（authentication.md「Password Reset」）。成功時は新しいリカバリーコードを返す。 */
export async function resetPassword(
  _prevState: FormState<RegisterData>,
  formData: FormData,
): Promise<FormState<RegisterData>> {
  // パスワードとリカバリーコードは再表示しない
  const values = { userId: String(formData.get("userId") ?? "") };

  const parsed = passwordResetSchema.safeParse({
    userId: values.userId,
    recoveryCode: formData.get("recoveryCode"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return { result: fail("VALIDATION_ERROR", "入力内容を確認してください", toFieldErrors(parsed.error)), values };
  }
  const { userId, recoveryCode, password } = parsed.data;

  try {
    const admin = createAdminClient();
    const { data: user, error: lookupError } = await admin
      .from("users")
      .select("id, status, recovery_code_hash")
      .eq("user_id", userId)
      .maybeSingle();
    if (lookupError) throw new Error(`user lookup failed: ${lookupError.message}`);

    const matched = user && user.status === "active" && hashesMatch(user.recovery_code_hash, hashRecoveryCode(recoveryCode));
    if (!user || !matched) {
      return { result: fail("UNAUTHENTICATED", INVALID_CREDENTIALS), values };
    }

    // 新コードを先に保存し、パスワード更新に失敗した場合は元に戻す
    const newRecoveryCode = generateRecoveryCode();
    const { error: hashError } = await admin
      .from("users")
      .update({ recovery_code_hash: hashRecoveryCode(newRecoveryCode) })
      .eq("id", user.id);
    if (hashError) throw new Error(`recovery code update failed: ${hashError.message}`);

    const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, { password });
    if (passwordError) {
      await admin.from("users").update({ recovery_code_hash: user.recovery_code_hash }).eq("id", user.id);
      throw new Error(`password update failed: ${passwordError.message}`);
    }

    return { result: ok({ recoveryCode: newRecoveryCode }), values };
  } catch (cause) {
    return { result: failInternal("resetPassword", cause), values };
  }
}
