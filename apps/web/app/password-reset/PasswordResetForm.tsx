"use client";

import Link from "next/link";
import { useActionState } from "react";

import { RecoveryCodeNotice } from "@/components/auth/RecoveryCodeNotice";
import { Alert } from "@/components/ui/Alert";
import { TextInput } from "@/components/ui/Fields";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { resetPassword } from "@/lib/auth/password-reset";
import type { RegisterData } from "@/lib/auth/register";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

export function PasswordResetForm() {
  const [state, formAction] = useActionState(resetPassword, null);
  const error = state?.result.ok === false ? state.result.error : null;

  if (state?.result.ok) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">パスワードを再設定しました。以前のリカバリーコードは無効になり、新しいコードが発行されました。</Alert>
        <RecoveryCodeNotice
          code={(state.result.data as RegisterData).recoveryCode}
          title="新しいリカバリーコード"
          primary={{ href: "/login", label: "ログイン画面へ" }}
        />
      </div>
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
        defaultValue={state?.values.userId ?? ""}
        error={error?.fieldErrors?.userId}
      />
      <TextInput
        label="リカバリーコード"
        name="recoveryCode"
        autoComplete="off"
        autoCapitalize="characters"
        required
        hint="登録時に表示されたコードを入力してください"
        error={error?.fieldErrors?.recoveryCode}
      />
      <TextInput
        label="新しいパスワード"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={`${PASSWORD_MIN_LENGTH}文字以上`}
        error={error?.fieldErrors?.password}
      />
      <TextInput
        label="新しいパスワード（確認）"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        required
        error={error?.fieldErrors?.passwordConfirm}
      />
      <SubmitButton pendingLabel="再設定中...">パスワードを再設定する</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="text-accent underline">
          ログインに戻る
        </Link>
      </p>
    </form>
  );
}
