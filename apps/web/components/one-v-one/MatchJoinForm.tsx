"use client";

import { useActionState } from "react";

import { ChartPicker } from "@/components/competition/ChartPicker";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { joinMatch } from "@/lib/one-v-one/actions";
import type { MusicRange } from "@/lib/one-v-one/music-range";

type MatchJoinFormProps = {
  matchId: string;
  range: MusicRange;
  /** 作成者の自選楽曲（選択不可） */
  creatorChartId: string;
  /** 指定相手が承認する場合はtrue、募集への挑戦はfalse */
  isAcceptance: boolean;
};

/** 範囲内から自選曲を選び、挑戦または承認を確定する。確定すると対戦が成立する。 */
export function MatchJoinForm({ matchId, range, creatorChartId, isAcceptance }: MatchJoinFormProps) {
  const [state, formAction] = useActionState(joinMatch, null);
  const error = state?.result.ok === false ? state.result.error : null;
  const verb = isAcceptance ? "承認" : "挑戦";

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        if (!window.confirm(`${verb}を確定しますか？確定すると対戦が成立し、ランダム楽曲が決定されます。`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="matchId" value={matchId} />
      {error && !error.fieldErrors && <Alert variant="error">{error.message}</Alert>}
      <ChartPicker
        name="opponentChartId"
        label="自選楽曲"
        max={1}
        range={range}
        excludedChartIds={[creatorChartId]}
        rules={["指定された範囲内の譜面から選択します", "作成者の自選楽曲と同じ譜面は選択できません"]}
        error={error?.fieldErrors?.opponentChartId}
      />
      <SubmitButton pendingLabel={`${verb}中...`}>{verb}を確定する</SubmitButton>
    </form>
  );
}
