import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MasterSyncPanel } from "@/components/admin/MasterSyncPanel";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Fields";
import {
  getMasterSummary,
  listMasterMusics,
  MASTER_PAGE_SIZE,
  type MasterMusic,
  type MasterSummary,
} from "@/lib/admin/master-queries";
import { formatJstDateTime } from "@/lib/competition/period";

export const metadata: Metadata = { title: "マスタ管理" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePage(value: string): number {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function pageHref(keyword: string, page: number): string {
  const params = new URLSearchParams();
  if (keyword) params.set("q", keyword);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/master?${query}` : "/admin/master";
}

function SummaryCard({ summary }: { summary: MasterSummary }) {
  const items = [
    { label: "楽曲数", value: summary.musicCount.toLocaleString("ja-JP") },
    { label: "有効な譜面数", value: summary.activeChartCount.toLocaleString("ja-JP") },
    { label: "無効な譜面数", value: summary.inactiveChartCount.toLocaleString("ja-JP") },
    { label: "Rating区分数", value: summary.ratingClassCount.toLocaleString("ja-JP") },
  ];
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold">登録状況</h2>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-xs text-foreground/70">{item.label}</dt>
            <dd className="text-2xl font-bold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-foreground/70">
        最終更新: {summary.lastUpdatedAt ? formatJstDateTime(summary.lastUpdatedAt) : "未同期"}
      </p>
    </Card>
  );
}

function MusicRow({ music }: { music: MasterMusic }) {
  return (
    <li className="flex flex-col gap-1 py-3">
      <span className="font-medium">{music.title}</span>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/80">
        {music.charts.map((chart) => (
          <li key={chart.id} className={chart.is_active ? "" : "line-through opacity-60"}>
            {chart.difficulty_type} {chart.level} ({chart.chart_constant.toFixed(1)}){chart.is_active ? "" : " 無効"}
          </li>
        ))}
      </ul>
    </li>
  );
}

async function MusicList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const keyword = single(params.q).trim().slice(0, 100);
  const page = parsePage(single(params.page));

  let result: Awaited<ReturnType<typeof listMasterMusics>>;
  let summary: MasterSummary;
  try {
    [summary, result] = await Promise.all([getMasterSummary(), listMasterMusics(keyword, page)]);
  } catch (cause) {
    console.error("[adminMaster]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">マスタ情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }

  const totalPages = Math.max(1, Math.ceil(result.total / MASTER_PAGE_SIZE));

  return (
    <>
      <SummaryCard summary={summary} />
      <Card className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">楽曲一覧</h2>
        <form action="/admin/master" className="flex items-end gap-2">
          <div className="flex-1">
            <TextInput label="楽曲名で検索" name="q" defaultValue={keyword} maxLength={100} />
          </div>
          <button type="submit" className={buttonStyles("secondary")}>
            検索
          </button>
        </form>
        {result.items.length === 0 ? (
          <p className="text-sm">該当する楽曲がありません。</p>
        ) : (
          <ul className="divide-y divide-border">
            {result.items.map((music) => (
              <MusicRow key={music.id} music={music} />
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between text-sm">
          <span>
            {result.total}件中 {page} / {totalPages} ページ
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(keyword, page - 1)} className={buttonStyles("secondary")}>
                前へ
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(keyword, page + 1)} className={buttonStyles("secondary")}>
                次へ
              </Link>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

export default function AdminMasterPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <PageHeader title="マスタ管理" />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">楽曲・譜面マスタの更新</h2>
          <MasterSyncPanel />
        </Card>
        <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
          <MusicList searchParams={searchParams} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
