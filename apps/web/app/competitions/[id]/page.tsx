import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CompetitionActionForm } from "@/components/competition/CompetitionActionForm";
import { ChartDisplay } from "@/components/chart/ChartDisplay";
import { CompetitionStatusBadge } from "@/components/competition/CompetitionStatusBadge";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { RatingBadge } from "@/components/user/RatingBadge";
import { requireUser } from "@/lib/auth/current-user";
import { joinCompetition, leaveCompetition } from "@/lib/competition/actions";
import { checkParticipationCondition } from "@/lib/competition/participation";
import { formatJstDateTime } from "@/lib/competition/period";
import {
  getActiveParticipants,
  getCompetitionDetail,
  getCompetitionRanking,
  getMyParticipation,
  getRatingClassOptions,
  type CompetitionDetail,
} from "@/lib/competition/queries";
import { UserDisplay } from "@/components/user/UserDisplay";
import { getProfileByUserNo } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "大会詳細" };

function ConditionText({ competition }: { competition: CompetitionDetail }) {
  const { ratingMin, ratingMax } = competition;
  if (!ratingMin && !ratingMax) return <span>制限なし</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {ratingMin ? <RatingBadge label={ratingMin.label} tier={ratingMin.tier} /> : "指定なし"}
      <span>〜</span>
      {ratingMax ? <RatingBadge label={ratingMax.label} tier={ratingMax.tier} /> : "指定なし"}
    </span>
  );
}

async function CompetitionContent({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const competition = await getCompetitionDetail(id);
  if (!competition) notFound();

  const [participation, participants, ranking, profile, ratingClasses] = await Promise.all([
    getMyParticipation(id, user.id),
    getActiveParticipants(id),
    getCompetitionRanking(id, competition.continuousPlayRequired),
    getProfileByUserNo(user.user_no),
    getRatingClassOptions(),
  ]);

  const isOrganizer = competition.organizer?.id === user.id;
  const orderOf = (ratingId: number | null | undefined) =>
    ratingClasses.find((rating) => rating.id === ratingId)?.sortOrder ?? null;
  const eligibility = checkParticipationCondition(orderOf(profile?.ratingClassId), {
    min: competition.ratingMin?.sortOrder ?? null,
    max: competition.ratingMax?.sortOrder ?? null,
  });

  const canJoin = competition.status !== "finished" && (participation.state === "none" || participation.state === "withdrawn");
  const canLeave =
    participation.state === "active" &&
    (competition.status === "scheduled" || (competition.status === "ongoing" && participation.submissionCount === 0));

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 border-t-4 border-t-mode-competition">
        <h2 className="text-xl font-bold tracking-tight">{competition.name}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CompetitionStatusBadge status={competition.status} />
          <span className="text-sm text-muted">
            {formatJstDateTime(competition.startAt)} 〜 {formatJstDateTime(competition.endAt)}
          </span>
        </div>
        {competition.description && <p className="whitespace-pre-wrap text-sm">{competition.description}</p>}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">参加条件:</span>
          <ConditionText competition={competition} />
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-foreground/40 px-2.5 py-0.5 text-xs font-semibold">
          {competition.continuousPlayRequired ? "全曲通し限定" : "各曲個別提出OK"}
        </span>
        <hr className="border-border" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">主催者:</span>
          {competition.organizer ? <UserDisplay {...competition.organizer} /> : "不明"}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>参加・提出</CardTitle>
        {participation.state === "removed" && (
          <Alert variant="error">主催者により参加が取り消されています。</Alert>
        )}
        {canJoin && !eligibility.ok && <Alert variant="info">{eligibility.reason}</Alert>}
        <div className="flex flex-wrap items-start gap-3">
          {canJoin && eligibility.ok && (
            <CompetitionActionForm
              action={joinCompetition}
              fields={{ competitionId: id }}
              label="参加する"
              pendingLabel="参加中..."
            />
          )}
          {canLeave && (
            <CompetitionActionForm
              action={leaveCompetition}
              fields={{ competitionId: id }}
              label="離脱する"
              variant="secondary"
              confirmMessage="この大会から離脱しますか？"
            />
          )}
          {participation.state === "active" && competition.status === "ongoing" && (
            <Link href="/bookmarklet" className={buttonStyles("primary")}>
              スコアを提出する
            </Link>
          )}
          {isOrganizer && (
            <Link href={`/competitions/${id}/manage`} className={buttonStyles("secondary")}>
              大会を管理する
            </Link>
          )}
        </div>
        {participation.state === "active" && competition.status === "ongoing" && (
          <p className="text-xs text-muted">
            オンゲキNETでブックマークレットを実行し、開かれたページで提出先にこの大会を選択してください。
          </p>
        )}
        {participation.state === "active" && !canLeave && competition.status === "ongoing" && (
          <p className="text-xs text-muted">スコアを提出済みのため離脱できません。</p>
        )}
      </Card>

      <Card>
        <CardTitle>課題曲</CardTitle>
        <ol className="flex flex-col divide-y divide-border text-sm">
          {competition.targetCharts.map((chart, index) => (
            <li key={chart.chartId} className="flex gap-3 py-2">
              <span className="w-6 shrink-0 text-muted">{index + 1}.</span>
              <ChartDisplay
                title={chart.title}
                difficulty={chart.difficulty}
                level={chart.level}
                chartConstant={chart.chartConstant}
              />
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardTitle>ランキング</CardTitle>
        {ranking.length === 0 ? (
          <p className="text-sm text-muted">まだ提出がありません。</p>
        ) : (
          <ol className="flex flex-col divide-y divide-border text-sm">
            {ranking.map((entry) => (
              <li key={entry.userId} className="flex items-center gap-3 py-2">
                <span className="w-8 shrink-0 text-center font-semibold">{entry.rank}</span>
                <span className="flex-1">
                  {entry.user ? <UserDisplay {...entry.user} /> : "不明なユーザー"}
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{entry.totalScore.toLocaleString("ja-JP")}</span>
                  <span className="block text-xs text-muted">{formatJstDateTime(entry.achievedAt)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <CardTitle>参加者（{participants.length}人）</CardTitle>
        {participants.length === 0 ? (
          <p className="text-sm text-muted">まだ参加者がいません。</p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {participants.map((participant) => (
              <li key={participant.id}>
                <UserDisplay {...participant} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function CompetitionDetailPage({ params }: PageProps<"/competitions/[id]">) {
  return (
    <PageContainer>
      <PageHeader
        title="大会の詳細"
        tone="competition"
        actions={
          <Link href="/competitions" className={buttonStyles("ghost")}>
            大会一覧へ
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-64 animate-pulse" aria-hidden="true" />}>
        <CompetitionContent params={params} />
      </Suspense>
    </PageContainer>
  );
}
