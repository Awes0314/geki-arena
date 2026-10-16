import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CompetitionActionForm } from "@/components/competition/CompetitionActionForm";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { MatchCharts } from "@/components/one-v-one/MatchCharts";
import { MatchJoinForm } from "@/components/one-v-one/MatchJoinForm";
import { OneVOneStatusBadge } from "@/components/one-v-one/OneVOneStatusBadge";
import { VersusPlayers } from "@/components/one-v-one/VersusPlayers";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { RatingRangeText } from "@/components/user/RatingRangeText";
import { UserDisplay } from "@/components/user/UserDisplay";
import { requireUser } from "@/lib/auth/current-user";
import { checkParticipationCondition } from "@/lib/competition/participation";
import { formatJstDateTime } from "@/lib/competition/period";
import { getRatingClassOptions } from "@/lib/competition/queries";
import { deleteMatch } from "@/lib/one-v-one/actions";
import { formatMusicRange } from "@/lib/one-v-one/music-range";
import { getMatchDetail, type OneVOneDetail } from "@/lib/one-v-one/queries";
import { getRecruitmentDeadline, type MatchOutcome } from "@/lib/one-v-one/status";
import { getProfileByUserNo } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "1v1詳細" };

const OUTCOME_LABELS: Record<MatchOutcome, string> = {
  creator_win: "作成者の勝利",
  opponent_win: "対戦相手の勝利",
  draw: "引き分け",
};

function ScoreRow({ label, user, score }: { label: string; user: OneVOneDetail["creator"]; score: number | null }) {
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="w-20 shrink-0 text-xs text-muted">{label}</span>
      <span className="flex-1">{user ? <UserDisplay {...user} /> : "未定"}</span>
      <span className="font-semibold">{score === null ? "未提出" : score.toLocaleString("ja-JP")}</span>
    </li>
  );
}

async function MatchContent({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const match = await getMatchDetail(id, user.id);
  if (!match) notFound();

  const [profile, ratingClasses] = await Promise.all([getProfileByUserNo(user.user_no), getRatingClassOptions()]);
  const viewerRatingOrder = ratingClasses.find((rating) => rating.id === profile?.ratingClassId)?.sortOrder ?? null;
  const eligibility = checkParticipationCondition(viewerRatingOrder, {
    min: match.ratingMin?.sortOrder ?? null,
    max: match.ratingMax?.sortOrder ?? null,
  });

  const waiting = match.status === "recruiting" || match.status === "pending_acceptance";
  const canAccept = match.status === "pending_acceptance" && match.isOpponent;
  const canChallenge = match.status === "recruiting" && !match.isCreator;
  const started = match.status === "established" || match.status === "finished";
  const canSubmit = match.status === "established" && (match.isCreator || match.isOpponent);
  const canDelete = match.isCreator && waiting;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 border-t-4 border-t-mode-one-v-one">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <OneVOneStatusBadge status={match.status} />
          {match.startAt && match.endAt ? (
            <span className="text-sm text-muted">
              {formatJstDateTime(match.startAt)} 〜 {formatJstDateTime(match.endAt)}
            </span>
          ) : (
            waiting && (
              <span className="text-sm text-muted">
                {formatJstDateTime(getRecruitmentDeadline(match.createdAt))} まで受付
              </span>
            )
          )}
        </div>
        <VersusPlayers creator={match.creator} opponent={match.opponent} />
        <hr className="border-border" />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">楽曲範囲:</span>
          <span>{formatMusicRange(match.range)}</span>
        </div>
        {match.status === "recruiting" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">募集Rating区分:</span>
            <RatingRangeText min={match.ratingMin} max={match.ratingMax} />
          </div>
        )}
      </Card>

      {match.status === "expired" && <Alert variant="info">募集の期限が切れたため、挑戦・承認はできません。</Alert>}

      {(canAccept || canChallenge || canSubmit || canDelete) && (
        <Card className="flex flex-col gap-3">
          <CardTitle>{canAccept ? "承認" : canChallenge ? "挑戦" : "操作"}</CardTitle>
          {canAccept && <p className="text-sm">あなたが対戦相手として指定されています。範囲内から自選楽曲を選んで承認してください。</p>}
          {canChallenge && !eligibility.ok && <Alert variant="info">{eligibility.reason}</Alert>}
          {match.creatorChart && (canAccept || (canChallenge && eligibility.ok)) && (
            <MatchJoinForm
              matchId={match.id}
              range={match.range}
              creatorChartId={match.creatorChart.chartId}
              isAcceptance={canAccept}
            />
          )}
          {canSubmit && (
            <>
              <Link href="/bookmarklet" className={buttonStyles("primary")}>
                スコアを提出する
              </Link>
              <p className="text-xs text-muted">
                オンゲキNETでブックマークレットを実行し、開かれたページで提出先にこの1v1を選択してください。3曲を連続してプレイした履歴が必要です。
              </p>
            </>
          )}
          {canDelete && (
            <CompetitionActionForm
              action={deleteMatch}
              fields={{ matchId: match.id }}
              label="この1v1を削除する"
              pendingLabel="削除中..."
              variant="danger"
              confirmMessage="この1v1を削除しますか？"
            />
          )}
        </Card>
      )}

      <Card>
        <CardTitle>対戦曲</CardTitle>
        <MatchCharts match={match} />
      </Card>

      {started && (
        <Card className="flex flex-col gap-3">
          <CardTitle>スコア</CardTitle>
          <ul className="flex flex-col divide-y divide-border">
            <ScoreRow label="作成者" user={match.creator} score={match.creatorScore} />
            <ScoreRow label="対戦相手" user={match.opponent} score={match.opponentScore} />
          </ul>
          {match.outcome ? (
            <p className="text-center text-lg font-bold">結果: {OUTCOME_LABELS[match.outcome]}</p>
          ) : (
            <p className="text-xs text-muted">対戦終了後に結果が確定します。</p>
          )}
        </Card>
      )}
    </div>
  );
}

export default function OneVOneDetailPage({ params }: PageProps<"/one-v-one/[id]">) {
  return (
    <PageContainer>
      <PageHeader
        title="1v1の詳細"
        tone="one-v-one"
        actions={
          <Link href="/one-v-one" className={buttonStyles("ghost")}>
            1v1一覧へ
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-64 animate-pulse" aria-hidden="true" />}>
        <MatchContent params={params} />
      </Suspense>
    </PageContainer>
  );
}
