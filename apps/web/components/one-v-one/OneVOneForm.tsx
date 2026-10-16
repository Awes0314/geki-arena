"use client";

import { useActionState, useState } from "react";

import { ChartPicker } from "@/components/competition/ChartPicker";
import { MusicRangeFields } from "@/components/one-v-one/MusicRangeFields";
import { UserPicker } from "@/components/one-v-one/UserPicker";
import { Alert } from "@/components/ui/Alert";
import { CheckboxCard } from "@/components/ui/CheckboxCard";
import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { RatingSelect } from "@/components/user/RatingSelect";
import type { RatingClassOption } from "@/lib/competition/queries";
import { createMatch } from "@/lib/one-v-one/actions";

const CHART_RULES = ["あなたが対戦で使う1曲目の譜面です。作成後は変更できません"];

/** 1v1作成フォーム。 */
export function OneVOneForm({ ratingClasses }: { ratingClasses: RatingClassOption[] }) {
  const [state, formAction] = useActionState(createMatch, null);
  const error = state?.result.ok === false ? state.result.error : null;
  const errors = error?.fieldErrors ?? {};
  const values = state?.values;
  const [hasOpponent, setHasOpponent] = useState(values?.hasOpponent === "on");

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {error && !error.fieldErrors && <Alert variant="error">{error.message}</Alert>}
      {error?.fieldErrors && <Alert variant="error">入力内容に誤りがあります。各項目をご確認ください。</Alert>}

      <FormSection title="自選楽曲">
        <ChartPicker name="creatorChartId" label="自選楽曲" max={1} rules={CHART_RULES} error={errors.creatorChartId} />
      </FormSection>

      <FormSection title="楽曲範囲">
        <p className="text-xs text-muted">
          対戦相手が2曲目を選ぶ範囲と、3曲目にランダムで選ばれる範囲です。レベル範囲または譜面定数範囲のいずれか一方を指定します。
        </p>
        <MusicRangeFields
          defaultType={values?.rangeType}
          defaultMin={values?.rangeMin}
          defaultMax={values?.rangeMax}
          errors={errors}
        />
      </FormSection>

      <FormSection title="対戦相手">
        <CheckboxCard
          name="hasOpponent"
          title="対戦相手を指定する"
          description="指定しない場合は1v1一覧に「募集中」として表示され、誰でも挑戦できます。"
          checked={hasOpponent}
          onCheckedChange={setHasOpponent}
        />
        {hasOpponent ? (
          <UserPicker name="opponentUserId" label="対戦希望相手" error={errors.opponentUserId} />
        ) : (
          <>
            <RatingSelect
              label="募集するRating区分（下限）"
              name="ratingMinId"
              options={ratingClasses}
              emptyLabel="指定なし"
              limits={["未指定の場合は制限なし"]}
              defaultValue={values?.ratingMinId ?? ""}
              error={errors.ratingMinId}
            />
            <RatingSelect
              label="募集するRating区分（上限）"
              name="ratingMaxId"
              options={ratingClasses}
              emptyLabel="指定なし"
              limits={["未指定の場合は制限なし", "下限と同じかそれより上の区分を指定"]}
              defaultValue={values?.ratingMaxId ?? ""}
              error={errors.ratingMaxId}
            />
          </>
        )}
      </FormSection>

      <SubmitButton pendingLabel="作成中...">1v1を作成する</SubmitButton>
    </form>
  );
}
