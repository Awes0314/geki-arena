import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";

import { CompetitionActionForm } from "@/components/competition/CompetitionActionForm";
import { CompetitionStatusBadge } from "@/components/competition/CompetitionStatusBadge";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminDeleteCompetition, adminRemoveParticipant } from "@/lib/admin/competition-actions";
import {
  getAdminCompetition,
  type AdminCompetitionDetail,
  type AdminCompetitionParticipant,
} from "@/lib/admin/competition-queries";
import { formatJstDateTime } from "@/lib/competition/period";

export const metadata: Metadata = { title: "大会詳細(運営)" };

function participantState(participant: AdminCompetitionParticipant): string {
  if (participant.removedAt) return "参加取消";
  if (participant.withdrawnAt) return "離脱";
  return "参加中";
}

function ParticipantRow({ participant, competitionId, deleted }: {
  participant: AdminCompetitionParticipant;
  competitionId: string;
  deleted: boolean;
}) {
  const canRemove = !deleted && !participant.removedAt;
  return (
    <li className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {participant.user ? (
          <Link href={`/admin/users/${participant.user.userNo}`} className="font-medium underline underline-offset-2">
            {participant.user.displayName}
          </Link>
        ) : (
          <span>不明</span>
        )}
        <p className="text-xs text-foreground/70">
          {participantState(participant)} / 提出 {participant.submissionCount}件
          {participant.bestScore !== null && ` / ベスト ${participant.bestScore.toLocaleString("ja-JP")}`}
        </p>
      </div>
      {canRemove && (
        <CompetitionActionForm
          action={adminRemoveParticipant}
          fields={{ competitionId, userId: participant.userId }}
          label="参加取消"
          pendingLabel="取消中..."
          variant="danger"
          confirmMessage={`${participant.user?.displayName ?? "このユーザー"} の参加を取り消します。よろしいですか？`}
          successMessage="取り消しました"
        />
      )}
    </li>
  );
}

function Detail({ competition }: { competition: AdminCompetitionDetail }) {
  const deleted = competition.deletedAt !== null;
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="break-words text-xl font-bold">{competition.name}</h2>
          {deleted ? (
            <StatusBadge label="削除済み" className="border-border bg-foreground/5" />
          ) : (
            <CompetitionStatusBadge status={competition.status} />
          )}
        </div>
        <p className="text-sm text-foreground/70">
          主催{" "}
          {competition.organizer ? (
            <Link href={`/admin/users/${competition.organizer.userNo}`} className="underline underline-offset-2">
              {competition.organizer.displayName}
            </Link>
          ) : (
            "不明"
          )}{" "}
          / {formatJstDateTime(competition.startAt)} 〜 {formatJstDateTime(competition.endAt)}
        </p>
        <p className="text-xs text-foreground/70">
          作成 {formatJstDateTime(competition.createdAt)}
          {competition.continuousPlayRequired && " / 連続プレイ必須"}
          {deleted && ` / 削除 ${formatJstDateTime(competition.deletedAt as string)}`}
        </p>
        {competition.description && <p className="whitespace-pre-wrap break-words text-sm">{competition.description}</p>}
        {!deleted && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`/competitions/${competition.id}`} className={buttonStyles("secondary")}>
              公開ページ
            </Link>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">課題曲</h2>
        <ol className="list-inside list-decimal text-sm">
          {competition.targetCharts.map((chart) => (
            <li key={chart.chartId}>
              {chart.title} ({chart.difficultyType} {chart.level})
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">参加者({competition.participants.length}人)</h2>
        {competition.participants.length === 0 ? (
          <p className="text-sm text-foreground/70">参加者はいません。</p>
        ) : (
          <ul className="divide-y divide-border">
            {competition.participants.map((participant) => (
              <ParticipantRow
                key={participant.userId}
                participant={participant}
                competitionId={competition.id}
                deleted={deleted}
              />
            ))}
          </ul>
        )}
      </Card>

      {!deleted && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">大会の削除</h2>
          <p className="text-sm">開催状況・参加者の有無にかかわらず削除します。削除した大会は元に戻せません。</p>
          <CompetitionActionForm
            action={adminDeleteCompetition}
            fields={{ competitionId: competition.id }}
            label="大会を削除"
            pendingLabel="削除中..."
            variant="danger"
            confirmMessage={`「${competition.name}」を削除します。よろしいですか？`}
            successMessage="削除しました"
          />
        </Card>
      )}
    </div>
  );
}

async function CompetitionDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  let competition: AdminCompetitionDetail | null;
  try {
    competition = await getAdminCompetition(id);
  } catch (cause) {
    console.error("[adminCompetitionDetail]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">大会情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  if (!competition) notFound();
  return <Detail competition={competition} />;
}

export default function AdminCompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageContainer>
      <PageHeader
        title="大会詳細(運営)"
        actions={
          <Link href="/admin/competitions" className={buttonStyles("secondary")}>
            一覧へ
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <CompetitionDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}
