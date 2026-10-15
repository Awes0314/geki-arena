"use client";

import { useActionState, type ReactNode } from "react";

import { ChartPicker } from "@/components/competition/ChartPicker";
import { DateTimeField } from "@/components/competition/DateTimeField";
import { Alert } from "@/components/ui/Alert";
import { CheckboxCard } from "@/components/ui/CheckboxCard";
import { TextArea, TextInput } from "@/components/ui/Fields";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { RatingSelect } from "@/components/user/RatingSelect";
import { createCompetition } from "@/lib/competition/actions";
import type { RatingClassOption } from "@/lib/competition/queries";
import {
  COMPETITION_DESCRIPTION_MAX_LENGTH,
  COMPETITION_NAME_MAX_LENGTH,
} from "@/lib/validation/competition";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

type CompetitionFormProps = {
  ratingClasses: RatingClassOption[];
  /** YYYY-MM-DDTHH:mm（JST） */
  defaultStartAt: string;
  defaultEndAt: string;
};

/** 大会作成フォーム。日時はJSTで入力する。 */
export function CompetitionForm({ ratingClasses, defaultStartAt, defaultEndAt }: CompetitionFormProps) {
  const [state, formAction] = useActionState(createCompetition, null);
  const error = state?.result.ok === false ? state.result.error : null;
  const errors = error?.fieldErrors ?? {};
  const values = state?.values;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {error && !error.fieldErrors && <Alert variant="error">{error.message}</Alert>}
      {error?.fieldErrors && <Alert variant="error">入力内容に誤りがあります。各項目をご確認ください。</Alert>}

      <Section title="基本情報">
        <TextInput
          label="大会名"
          name="name"
          required
          limits={[`${COMPETITION_NAME_MAX_LENGTH}文字以内`]}
          maxLength={COMPETITION_NAME_MAX_LENGTH}
          defaultValue={values?.name}
          error={errors.name}
        />
        <TextArea
          label="説明"
          name="description"
          rows={4}
          limits={[`${COMPETITION_DESCRIPTION_MAX_LENGTH}文字以内`, "作成後に変更できる項目は説明のみ"]}
          maxLength={COMPETITION_DESCRIPTION_MAX_LENGTH}
          defaultValue={values?.description}
          error={errors.description}
        />
      </Section>

      <Section title="開催期間（日本時間）">
        {errors.periodOverlap && <Alert variant="warning">{errors.periodOverlap}</Alert>}
        <DateTimeField
          label="開始日時"
          name="startAt"
          required
          defaultValue={values?.startAt ?? defaultStartAt}
          limits={["10分単位", "現在日時より後"]}
          error={errors.startAt}
        />
        <DateTimeField
          label="終了日時"
          name="endAt"
          required
          defaultValue={values?.endAt ?? defaultEndAt}
          limits={["10分単位", "開始日時より後", "開催期間は24時間以上90日以内", "自身が主催する他の大会と期間が重複しない"]}
          error={errors.endAt}
        />
      </Section>

      <Section title="参加条件">
        <RatingSelect
          label="Rating区分（下限）"
          name="ratingMinId"
          options={ratingClasses}
          emptyLabel="指定なし"
          limits={["未指定の場合は制限なし"]}
          defaultValue={values?.ratingMinId ?? ""}
          error={errors.ratingMinId}
        />
        <RatingSelect
          label="Rating区分（上限）"
          name="ratingMaxId"
          options={ratingClasses}
          emptyLabel="指定なし"
          limits={["未指定の場合は制限なし", "下限と同じかそれより上の区分を指定"]}
          defaultValue={values?.ratingMaxId ?? ""}
          error={errors.ratingMaxId}
        />
      </Section>

      <Section title="課題曲">
        <ChartPicker error={errors.chartIds} />
      </Section>

      <Section title="オプション">
        <CheckboxCard
          name="continuousPlayRequired"
          title="連続プレイを必須にする"
          description="課題曲全曲を連続して（間隔30分以内）プレイして提出します。プレイ順は問いません。"
          defaultChecked={values?.continuousPlayRequired === "on"}
        />
      </Section>

      <SubmitButton pendingLabel="作成中...">大会を作成する</SubmitButton>
    </form>
  );
}
