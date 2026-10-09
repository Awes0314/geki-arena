"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/Alert";
import { TextInput } from "@/components/ui/Fields";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { login } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, formAction] = useActionState(login, null);
  const error = state?.result.ok === false ? state.result.error : null;

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
        label="パスワード"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={error?.fieldErrors?.password}
      />
      <SubmitButton pendingLabel="ログイン中...">ログイン</SubmitButton>
    </form>
  );
}
