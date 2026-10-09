"use client";

import Link from "next/link";
import { useActionState } from "react";

import { RecoveryCodeNotice } from "@/components/auth/RecoveryCodeNotice";
import { Alert } from "@/components/ui/Alert";
import { TextInput } from "@/components/ui/Fields";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { register, type RegisterData } from "@/lib/auth/register";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

export function RegisterForm() {
  const [state, formAction] = useActionState(register, null);
  const error = state?.result.ok === false ? state.result.error : null;

  if (state?.result.ok) {
    return (
      <RecoveryCodeNotice
        code={(state.result.data as RegisterData).recoveryCode}
        title="登録が完了しました"
        primary={{ href: "/profile/edit?onboarding=1", label: "表示名・アイコンを設定する" }}
        secondary={{ href: "/", label: "スキップしてホームへ" }}
      />
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {error && !error.fieldErrors && <Alert variant="error">{error.message}</Alert>}
      <TextInput
        label="ユーザーID"
        name="userId"
        autoComplete="username"
        autoCapitalize="none"
        required
        maxLength={20}
        hint="半角英数字とアンダースコア、3〜20文字（大文字小文字は区別されません）"
        defaultValue={state?.values.userId ?? ""}
        error={error?.fieldErrors?.userId}
      />
      <TextInput
        label="パスワード"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={`${PASSWORD_MIN_LENGTH}文字以上`}
        error={error?.fieldErrors?.password}
      />
      <TextInput
        label="パスワード（確認）"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        required
        error={error?.fieldErrors?.passwordConfirm}
      />
      <SubmitButton pendingLabel="登録中...">登録する</SubmitButton>
      <p className="text-center text-sm">
        アカウントをお持ちの方は{" "}
        <Link href="/login" className="text-accent underline">
          ログイン
        </Link>
      </p>
    </form>
  );
}
