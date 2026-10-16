import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";

import { CompetitionActionForm } from "@/components/competition/CompetitionActionForm";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { OneVOneStatusBadge } from "@/components/one-v-one/OneVOneStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminDeleteMatch } from "@/lib/admin/one-v-one-actions";
import { getAdminMatch, type AdminMatchDetail, type ChartSummary } from "@/lib/admin/one-v-one-queries";
import { formatJstDateTime } from "@/lib/competition/period";

export const metadata: Metadata = { title: "1v1詳細(運営)" };

function ChartText({ chart }: { chart: ChartSummary | null }) {
  if (!chart) return <span className="text-foreground/70">未定</span>;
  return (
    <span>
      {chart.title} ({chart.difficultyType} {chart.level})
    </span>
  );
}

function PlayerRow({ label, user, score }: { label: string; user: AdminMatchDetail["creator"]; score: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span>
        <span className="mr-2 text-xs text-foreground/70">{label}</span>
        {user ? (
          <Link href={`/admin/users/${user.userNo}`} className="font-medium underline underline-offset-2">
            {user.displayName}
          </Link>
        ) : (
          <span className="text-foreground/70">未定</span>
        )}
      </span>
      <span className="tabular-nums">{score === null ? "未提出" : score.toLocaleString("ja-JP")}</span>
    </div>
  );
}

function Detail({ match }: { match: AdminMatchDetail }) {
  const deleted = match.deletedAt !== null;
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">
            {match.creator?.displayName ?? "不明"} vs {match.opponent?.displayName ?? "(未定)"}
          </h2>
          {match.status ? (
            <OneVOneStatusBadge status={match.status} />
          ) : (
            <StatusBadge label="削除済み" className="border-border bg-foreground/5" />
          )}
        </div>
        <p className="text-xs text-foreground/70">
          作成 {formatJstDateTime(match.createdAt)}
          {match.startAt && match.endAt && ` / 対戦期間 ${formatJstDateTime(match.startAt)} 〜 ${formatJstDateTime(match.endAt)}`}
          {deleted && ` / 削除 ${formatJstDateTime(match.deletedAt as string)}`}
        </p>
        {!deleted && (
          <div>
            <Link href={`/one-v-one/${match.id}`} className={buttonStyles("secondary")}>
              公開ページ
            </Link>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-semibold">対戦者とスコア</h2>
        <div className="divide-y divide-border">
          <PlayerRow label="作成者" user={match.creator} score={match.creatorScore} />
          <PlayerRow label="対戦相手" user={match.opponent} score={match.opponentScore} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-semibold">楽曲</h2>
        <dl className="flex flex-col gap-1 text-sm">
          <div>
            <dt className="text-xs text-foreground/70">作成者の選曲</dt>
            <dd>
              <ChartText chart={match.creatorChart} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground/70">相手の選曲</dt>
            <dd>
              <ChartText chart={match.opponentChart} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground/70">ランダム選曲</dt>
            <dd>
              <ChartText chart={match.randomChart} />
            </dd>
          </div>
        </dl>
      </Card>

      {!deleted && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">対戦の削除</h2>
          <p className="text-sm">成立後・開始後であっても削除します。削除した対戦は元に戻せません。</p>
          <CompetitionActionForm
            action={adminDeleteMatch}
            fields={{ matchId: match.id }}
            label="対戦を削除"
            pendingLabel="削除中..."
            variant="danger"
            confirmMessage="この対戦を削除します。よろしいですか？"
            successMessage="削除しました"
          />
        </Card>
      )}
    </div>
  );
}

async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  let match: AdminMatchDetail | null;
  try {
    match = await getAdminMatch(id);
  } catch (cause) {
    console.error("[adminOneVOneDetail]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">対戦情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  if (!match) notFound();
  return <Detail match={match} />;
}

export default function AdminOneVOneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageContainer>
      <PageHeader
        title="1v1詳細(運営)"
        actions={
          <Link href="/admin/one-v-one" className={buttonStyles("secondary")}>
            一覧へ
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <MatchDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}
