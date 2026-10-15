"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectInput } from "@/components/ui/Fields";
import {
  getSubmittableCompetitions,
  prepareCompetitionSubmission,
  submitCompetitionScores,
  type CompetitionSubmissionPreview,
  type CompetitionSubmissionResult,
  type SubmittableCompetition,
} from "@/lib/competition/submission-actions";
import type { BookmarkletPayload, BookmarkletPlay } from "@/lib/score-submission/schema";

const NOT_SUBMITTED = "";

function playLabel(play: BookmarkletPlay): string {
  return `${play.playDateTime.slice(5, 16).replace("T", " ")} / ${play.technicalScore.toLocaleString("ja-JP")}`;
}

/** 受信したプレイ履歴を、参加中の開催中の大会へ提出するパネル。 */
export function CompetitionSubmitPanel({ payload }: { payload: BookmarkletPayload }) {
  const [competitions, setCompetitions] = useState<SubmittableCompetition[] | null>(null);
  const [competitionId, setCompetitionId] = useState("");
  const [preview, setPreview] = useState<CompetitionSubmissionPreview | null>(null);
  /** 課題曲ID -> 選択したプレイidx（未提出は空文字） */
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CompetitionSubmissionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const playsByIdx = new Map(payload.plays.map((play) => [play.idx, play]));

  useEffect(() => {
    let cancelled = false;
    void getSubmittableCompetitions().then((response) => {
      if (cancelled) return;
      if (response.ok) setCompetitions(response.data);
      else {
        setCompetitions([]);
        setMessage(response.error.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectCompetition(id: string) {
    setCompetitionId(id);
    setPreview(null);
    setMessage(null);
    if (id === "") return;
    startTransition(async () => {
      const response = await prepareCompetitionSubmission({ payload, competitionId: id });
      if (!response.ok) {
        setMessage(response.error.message);
        return;
      }
      setPreview(response.data);
      setSelection(
        Object.fromEntries(
          response.data.targets.map((target) => [
            target.chartId,
            response.data.candidatesByChart[target.chartId]?.[0] ?? NOT_SUBMITTED,
          ]),
        ),
      );
    });
  }

  function submit() {
    if (!preview) return;
    const selectedIdx = preview.continuousPlayRequired
      ? (preview.continuousIdx ?? [])
      : Object.values(selection).filter((idx) => idx !== NOT_SUBMITTED);
    setMessage(null);
    startTransition(async () => {
      const response = await submitCompetitionScores({ payload, competitionId, selectedIdx });
      if (response.ok) setResult(response.data);
      else setMessage(response.error.message);
    });
  }

  if (result) {
    return (
      <Card className="flex flex-col gap-3">
        <Alert variant="success">
          {result.submittedCount}曲を提出しました。
          {result.improved
            ? ` 現在の合計スコアは ${result.totalScore.toLocaleString("ja-JP")} です。`
            : " 既存の記録を上回らなかったため、順位は更新されませんでした。"}
        </Alert>
        <Link href={`/competitions/${result.competitionId}`} className={buttonStyles("primary")}>
          ランキングを見る
        </Link>
      </Card>
    );
  }

  if (competitions === null) return <Alert variant="info">提出先の大会を確認しています...</Alert>;

  if (competitions.length === 0) {
    return (
      <Alert variant="info">
        提出できる大会がありません。参加中で開催中の大会がある場合にのみ提出できます。
        <Link href="/competitions" className="ml-2 underline">
          大会一覧へ
        </Link>
      </Alert>
    );
  }

  const canSubmit = preview
    ? preview.continuousPlayRequired
      ? preview.continuousIdx !== null
      : Object.values(selection).some((idx) => idx !== NOT_SUBMITTED)
    : false;

  return (
    <Card className="flex flex-col gap-4">
      <SelectInput label="提出先の大会" value={competitionId} onChange={(event) => selectCompetition(event.target.value)}>
        <option value="">選択してください</option>
        {competitions.map((competition) => (
          <option key={competition.id} value={competition.id}>
            {competition.name}
            {competition.continuousPlayRequired ? "（連続プレイ必須）" : ""}
          </option>
        ))}
      </SelectInput>

      {message && <Alert variant="error">{message}</Alert>}

      {preview?.continuousPlayRequired &&
        (preview.continuousIdx ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">提出するプレイ（連続プレイ）</p>
            <ol className="flex flex-col divide-y divide-border text-sm">
              {preview.continuousIdx.map((idx, index) => {
                const play = playsByIdx.get(idx);
                return (
                  <li key={idx} className="py-2">
                    {index + 1}. {play?.title} <span className="text-muted">{play && playLabel(play)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <Alert variant="error">
            課題曲を順番通りに連続して（間隔30分以内）プレイした履歴が見つかりません。
          </Alert>
        ))}

      {preview && !preview.continuousPlayRequired && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">課題曲ごとに提出するプレイを選択</p>
          {preview.targets.map((target) => {
            const candidates = preview.candidatesByChart[target.chartId] ?? [];
            return (
              <SelectInput
                key={target.chartId}
                label={`${target.title} [${target.difficulty} Lv.${target.level}]`}
                value={selection[target.chartId] ?? NOT_SUBMITTED}
                onChange={(event) => setSelection((current) => ({ ...current, [target.chartId]: event.target.value }))}
                disabled={candidates.length === 0}
              >
                <option value={NOT_SUBMITTED}>{candidates.length === 0 ? "該当プレイなし" : "提出しない"}</option>
                {candidates.map((idx) => {
                  const play = playsByIdx.get(idx);
                  return (
                    <option key={idx} value={idx}>
                      {play ? playLabel(play) : idx}
                    </option>
                  );
                })}
              </SelectInput>
            );
          })}
        </div>
      )}

      <Button variant="primary" onClick={submit} disabled={!canSubmit || pending}>
        {pending ? "処理中..." : "提出する"}
      </Button>
    </Card>
  );
}
