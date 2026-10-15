"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ButtonVariant } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/result";

type CompetitionActionFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  /** 送信するhidden項目（competitionId, userIdなど） */
  fields: Record<string, string>;
  label: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  /** 指定時は送信前に確認ダイアログを表示する */
  confirmMessage?: string;
  successMessage?: string;
};

/** 参加・離脱・削除などの単一ボタンのServer Action用フォーム。結果メッセージを表示する。 */
export function CompetitionActionForm({
  action,
  fields,
  label,
  pendingLabel,
  variant,
  confirmMessage,
  successMessage,
}: CompetitionActionFormProps) {
  const [state, formAction] = useActionState(action, null);
  const error = state?.result.ok === false ? state.result.error : null;

  return (
    <form
      action={formAction}
      className="flex flex-col items-start gap-2"
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={variant} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
      {error && <Alert variant="error">{error.message}</Alert>}
      {state?.result.ok && successMessage && <Alert variant="success">{successMessage}</Alert>}
    </form>
  );
}
