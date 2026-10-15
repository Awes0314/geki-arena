"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/Alert";
import { TextArea } from "@/components/ui/Fields";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updateCompetitionDescription } from "@/lib/competition/actions";
import { COMPETITION_DESCRIPTION_MAX_LENGTH } from "@/lib/validation/competition";

export function DescriptionForm({ competitionId, description }: { competitionId: string; description: string }) {
  const [state, formAction] = useActionState(updateCompetitionDescription, null);
  const error = state?.result.ok === false ? state.result.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="competitionId" value={competitionId} />
      {error && !error.fieldErrors && <Alert variant="error">{error.message}</Alert>}
      {state?.result.ok && <Alert variant="success">説明を更新しました。</Alert>}
      <TextArea
        label="説明"
        name="description"
        rows={5}
        maxLength={COMPETITION_DESCRIPTION_MAX_LENGTH}
        defaultValue={state?.values.description ?? description}
        error={error?.fieldErrors?.description}
      />
      <SubmitButton pendingLabel="保存中...">説明を保存</SubmitButton>
    </form>
  );
}
