"use server";

import { redirect } from "next/navigation";

import { fail, failInternal, type FormState } from "@/lib/actions/result";
import { userIdToInternalEmail } from "@/lib/auth/internal-email";
import { recordActivity } from "@/lib/logging/activity-log";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";
import { toFieldErrors } from "@/lib/validation/field-errors";

export async function login(_prevState: FormState, formData: FormData): Promise<FormState> {
  // パスワードは再表示しない
  const values = { userId: String(formData.get("userId") ?? "") };

  const parsed = loginSchema.safeParse({ userId: values.userId, password: formData.get("password") });
  if (!parsed.success) {
    return { result: fail("VALIDATION_ERROR", "入力内容を確認してください", toFieldErrors(parsed.error)), values };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userIdToInternalEmail(parsed.data.userId),
      password: parsed.data.password,
    });

    if (error || !data.user) {
      await recordActivity({ eventType: "login_failed", detail: { reason: "invalid_credentials" } });
      return { result: fail("UNAUTHENTICATED", "ユーザーIDまたはパスワードが正しくありません"), values };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.status !== "active") {
      await supabase.auth.signOut();
      await recordActivity({ eventType: "login_failed", userId: data.user.id, detail: { reason: "inactive" } });
      return { result: fail("FORBIDDEN", "このアカウントは現在ご利用いただけません"), values };
    }

    await recordActivity({ eventType: "login", userId: data.user.id });
  } catch (cause) {
    return { result: failInternal("login", cause), values };
  }

  redirect("/");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  if (data.user) await recordActivity({ eventType: "logout", userId: data.user.id });
  redirect("/login");
}
