"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectInput } from "@/components/ui/Fields";
import {
  getSubmittableMatches,
  prepareMatchSubmission,
  submitMatchScores,
  type MatchSubmissionPreview,
  type MatchSubmissionResult,
  type SubmittableMatch,
} from "@/lib/one-v-one/submission-actions";
import type { BookmarkletPayload, BookmarkletPlay } from "@/lib/score-submission/schema";

function playLabel(play: BookmarkletPlay): string {
  return `${play.playDateTime.slice(5, 16).replace("T", " ")} / ${play.technicalScore.toLocaleString("ja-JP")}`;
}

/** 受信したプレイ履歴（3曲連続プレイ）を、対戦中の1v1へ提出するパネル。 */
export function MatchSubmitPanel({ payload }: { payload: BookmarkletPayload }) {
  const [matches, setMatches] = useState<SubmittableMatch[] | null>(null);
  const [matchId, setMatchId] = useState("");
  const [preview, setPreview] = useState<MatchSubmissionPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MatchSubmissionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const playsByIdx = new Map(payload.plays.map((play) => [play.idx, play]));

  useEffect(() => {
    let cancelled = false;
    void getSubmittableMatches().then((response) => {
      if (cancelled) return;
      if (response.ok) setMatches(response.data);
      else {
        setMatches([]);
        setMessage(response.error.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectMatch(id: string) {
    setMatchId(id);
    setPreview(null);
    setMessage(null);
    if (id === "") return;
    startTransition(async () => {
      const response = await prepareMatchSubmission({ payload, matchId: id });
      if (response.ok) setPreview(response.data);
      else setMessage(response.error.message);
    });
  }

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const response = await submitMatchScores({ payload, matchId });
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
            : " 既存の記録を上回らなかったため、スコアは更新されませんでした。"}
        </Alert>
        <Link href={`/one-v-one/${result.matchId}`} className={buttonStyles("primary")}>
          対戦の状況を見る
        </Link>
      </Card>
    );
  }

  if (matches === null) return <Alert variant="info">提出先の1v1を確認しています...</Alert>;

  if (matches.length === 0) {
    return (
      <Alert variant="info">
        提出できる1v1がありません。参加中で対戦中の1v1がある場合にのみ提出できます。
        <Link href="/one-v-one" className="ml-2 underline">
          1v1一覧へ
        </Link>
      </Alert>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <SelectInput label="提出先の1v1" value={matchId} onChange={(event) => selectMatch(event.target.value)}>
        <option value="">選択してください</option>
        {matches.map((match) => (
          <option key={match.id} value={match.id}>
            {match.label}
          </option>
        ))}
      </SelectInput>

      {message && <Alert variant="error">{message}</Alert>}

      {preview &&
        (preview.continuousIdx ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">提出するプレイ（3曲連続プレイ）</p>
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
          <Alert variant="error">課題曲3曲を連続して（間隔30分以内）プレイした履歴が見つかりません。</Alert>
        ))}

      <Button variant="primary" onClick={submit} disabled={!preview?.continuousIdx || pending}>
        {pending ? "処理中..." : "提出する"}
      </Button>
    </Card>
  );
}
