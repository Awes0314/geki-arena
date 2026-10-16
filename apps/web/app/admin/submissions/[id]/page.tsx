import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { SubmissionFlagBadges } from "@/components/admin/SubmissionFlagBadges";
import { CompetitionActionForm } from "@/components/competition/CompetitionActionForm";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { adminDeleteSubmission } from "@/lib/admin/submission-actions";
import { SUBMISSION_CONTEXT_LABELS } from "@/lib/admin/submission-labels";
import { getAdminSubmission, type AdminSongScore, type AdminSubmissionDetail } from "@/lib/admin/submission-queries";
import { formatJstDateTime } from "@/lib/competition/period";

export const metadata: Metadata = { title: "提出詳細" };

function contextHref(submission: AdminSubmissionDetail): string | null {
  if (submission.contextType === "competition") return `/admin/competitions/${submission.contextId}`;
  if (submission.contextType === "one_v_one") return `/admin/one-v-one/${submission.contextId}`;
  return null;
}

const display = (value: number | string | null) => (value === null ? "-" : value.toLocaleString("ja-JP"));

function SongRow({ song }: { song: AdminSongScore }) {
  return (
    <li className="flex flex-col gap-1 py-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">
          {song.orderIndex + 1}. {song.title ?? "(譜面未特定)"}
          {song.difficultyType && ` (${song.difficultyType} ${song.level})`}
        </span>
        <span className="font-bold tabular-nums">{song.technicalScore.toLocaleString("ja-JP")}</span>
      </div>
      <p className="text-xs text-foreground/70">
        プレイ {formatJstDateTime(song.playDateTime)} / コンボ {display(song.maxCombo)} / C.BREAK {display(song.criticalBreak)} /
        BREAK {display(song.breakCount)} / HIT {display(song.hitCount)} / MISS {display(song.missCount)} / BELL{" "}
        {display(song.bellCount)} / DAMAGE {display(song.damageCount)}
      </p>
    </li>
  );
}

function Detail({ submission }: { submission: AdminSubmissionDetail }) {
  const href = contextHref(submission);
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold tabular-nums">{submission.totalScore.toLocaleString("ja-JP")}</h2>
          <SubmissionFlagBadges flags={submission.flags} />
        </div>
        <p className="text-sm">
          提出者{" "}
          {submission.submitter ? (
            <Link href={`/admin/users/${submission.submitter.userNo}`} className="underline underline-offset-2">
              {submission.submitter.displayName}
            </Link>
          ) : (
            "不明"
          )}
        </p>
        <p className="text-xs text-foreground/70">
          {SUBMISSION_CONTEXT_LABELS[submission.contextType]}
          {href && (
            <>
              {" ("}
              <Link href={href} className="underline underline-offset-2">
                提出先を表示
              </Link>
              {")"}
            </>
          )}
          {" / "}提出 {formatJstDateTime(submission.submittedAt)}
          {submission.updateApplied && " / 記録更新あり"}
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-semibold">曲ごとのスコア</h2>
        <ul className="divide-y divide-border">
          {submission.songs.map((song) => (
            <SongRow key={song.orderIndex} song={song} />
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">提出の削除</h2>
        <p className="text-sm">
          削除すると、この提出を参照している大会のベスト記録・1v1のスコアは残りの提出から再計算されます(コースは挑戦結果を削除。獲得済みバッジは維持)。元に戻せません。
        </p>
        <CompetitionActionForm
          action={adminDeleteSubmission}
          fields={{ submissionId: submission.id }}
          label="提出を削除"
          pendingLabel="削除中..."
          variant="danger"
          confirmMessage="この提出を削除します。よろしいですか？"
          successMessage="削除しました"
        />
      </Card>
    </div>
  );
}

async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  let submission: AdminSubmissionDetail | null;
  try {
    submission = await getAdminSubmission(id);
  } catch (cause) {
    console.error("[adminSubmissionDetail]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">提出情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  if (!submission) notFound();
  return <Detail submission={submission} />;
}

export default function AdminSubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageContainer>
      <PageHeader
        title="提出詳細"
        actions={
          <Link href="/admin/submissions" className={buttonStyles("secondary")}>
            一覧へ
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <SubmissionDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}
