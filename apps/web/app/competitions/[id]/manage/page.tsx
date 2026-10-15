import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CompetitionActionForm } from "@/components/competition/CompetitionActionForm";
import { ChartDisplay } from "@/components/chart/ChartDisplay";
import { CompetitionStatusBadge } from "@/components/competition/CompetitionStatusBadge";
import { DescriptionForm } from "@/components/competition/DescriptionForm";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { UserDisplay } from "@/components/user/UserDisplay";
import { requireUser } from "@/lib/auth/current-user";
import { deleteCompetition, removeParticipant } from "@/lib/competition/actions";
import { formatJstDateTime } from "@/lib/competition/period";
import { getCompetitionDetail, getParticipantSubmissionStatuses } from "@/lib/competition/queries";

export const metadata: Metadata = { title: "大会の管理" };

async function ManageContent({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const competition = await getCompetitionDetail(id);
  if (!competition || competition.organizer?.id !== user.id) notFound();

  const statuses = await getParticipantSubmissionStatuses(id);
  const chartById = new Map(competition.targetCharts.map((chart) => [chart.chartId, chart]));
  const canDelete = competition.status === "scheduled" || statuses.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="主催中大会の管理"
        tone="competition"
        actions={
          <Link href={`/competitions/${id}`} className={buttonStyles("ghost")}>
            大会詳細へ
          </Link>
        }
      />

      <Card className="flex flex-col gap-2 border-t-4 border-t-mode-competition">
        <h2 className="text-xl font-bold tracking-tight">{competition.name}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CompetitionStatusBadge status={competition.status} />
          <span className="text-sm text-muted">
            {formatJstDateTime(competition.startAt)} 〜 {formatJstDateTime(competition.endAt)}
          </span>
        </div>
      </Card>

      <Card>
        <CardTitle>説明の編集</CardTitle>
        <DescriptionForm competitionId={id} description={competition.description ?? ""} />
      </Card>

      <Card>
        <CardTitle>参加者の管理（{statuses.length}人）</CardTitle>
        {statuses.length === 0 ? (
          <p className="text-sm text-muted">まだ参加者がいません。</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {statuses.map((participant) => (
              <li key={participant.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex-1">
                    <UserDisplay {...participant} />
                  </span>
                  <CompetitionActionForm
                    action={removeParticipant}
                    fields={{ competitionId: id, userId: participant.id }}
                    label="参加を取り消す"
                    variant="danger"
                    confirmMessage={`${participant.displayName}さんの参加を取り消しますか？取り消した参加者は再参加できません。`}
                  />
                </div>
                <p className="text-xs text-muted">
                  参加日時: {formatJstDateTime(participant.joinedAt)} / 提出 {participant.submissions.length}件
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>提出状況</CardTitle>
        {statuses.every((participant) => participant.submissions.length === 0) ? (
          <p className="text-sm text-muted">まだ提出がありません。</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {statuses
              .filter((participant) => participant.submissions.length > 0)
              .map((participant) => (
                <li key={participant.id} className="flex flex-col gap-3 py-3">
                  <UserDisplay {...participant} />
                  <ul className="flex flex-col gap-3">
                    {participant.submissions.map((submission) => (
                      <li key={submission.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                        <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                          <span className="text-muted">{formatJstDateTime(submission.submittedAt)} 提出</span>
                          <span className="font-semibold">
                            合計 {submission.totalScore.toLocaleString("ja-JP")}
                          </span>
                        </p>
                        <ul className="flex flex-col divide-y divide-border">
                          {submission.songs.map((song) => {
                            const chart = chartById.get(song.chartId);
                            return (
                              <li key={song.chartId} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                                {chart ? (
                                  <ChartDisplay
                                    title={chart.title}
                                    difficulty={chart.difficulty}
                                    level={chart.level}
                                    chartConstant={chart.chartConstant}
                                  />
                                ) : (
                                  <span className="text-sm text-muted">不明な譜面</span>
                                )}
                                <span className="text-sm">
                                  <span className="font-medium">{song.technicalScore.toLocaleString("ja-JP")}</span>
                                  <span className="ml-2 text-xs text-muted">{formatJstDateTime(song.playDateTime)} プレイ</span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>大会の削除</CardTitle>
        {canDelete ? (
          <p className="text-sm">削除すると大会は一覧や詳細から表示されなくなります。</p>
        ) : (
          <Alert variant="info">開催後は参加者がいる大会を削除できません。</Alert>
        )}
        {canDelete && (
          <CompetitionActionForm
            action={deleteCompetition}
            fields={{ competitionId: id }}
            label="大会を削除する"
            pendingLabel="削除中..."
            variant="danger"
            confirmMessage="この大会を削除しますか？この操作は取り消せません。"
          />
        )}
      </Card>
    </div>
  );
}

export default function ManageCompetitionPage({ params }: PageProps<"/competitions/[id]/manage">) {
  return (
    <PageContainer>
      <Suspense fallback={<Card className="h-64 animate-pulse" aria-hidden="true" />}>
        <ManageContent params={params} />
      </Suspense>
    </PageContainer>
  );
}
