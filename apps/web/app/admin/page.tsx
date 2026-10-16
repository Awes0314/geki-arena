import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { getDashboardStats, type DashboardStats } from "@/lib/admin/dashboard";

export const metadata: Metadata = { title: "運営ダッシュボード" };

function StatItem({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <dt className="text-xs text-foreground/70">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value.toLocaleString("ja-JP")}</dd>
      {sub && <dd className="text-xs text-foreground/70">{sub}</dd>}
    </div>
  );
}

function StatsSection({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <Card>
        <h2 className="mb-3 text-base font-semibold">現況</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatItem label="ユーザー数" value={stats.users.total} sub={`停止中 ${stats.users.suspended}`} />
          <StatItem label="開催中の大会" value={stats.competitions.ongoing} sub={`全${stats.competitions.total}件`} />
          <StatItem
            label="1v1(募集中)"
            value={stats.oneVOne.recruiting}
            sub={`成立 ${stats.oneVOne.established} / 全${stats.oneVOne.total}件`}
          />
          <StatItem label="未対応の通報" value={stats.openReports} />
        </dl>
      </Card>
      {stats.periods.map((period) => (
        <Card key={period.label}>
          <h2 className="mb-3 text-base font-semibold">{period.label}</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatItem label="大会作成数" value={period.competitionsCreated} />
            <StatItem label="スコア提出数" value={period.submissions} />
            <StatItem label="ログイン数" value={period.logins} />
            <StatItem label="エラー数" value={period.errors} />
          </dl>
        </Card>
      ))}
    </>
  );
}

async function DashboardContent() {
  // new Date()を使う前にリクエスト時レンダリングへ切り替える
  await connection();
  let stats: DashboardStats;
  try {
    stats = await getDashboardStats();
  } catch (cause) {
    console.error("[adminDashboard]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">集計の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  return <StatsSection stats={stats} />;
}

export default function AdminPage() {
  return (
    <PageContainer>
      <PageHeader title="運営ダッシュボード" />
      <div className="flex flex-col gap-4">
        <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
          <DashboardContent />
        </Suspense>
      </div>
    </PageContainer>
  );
}
