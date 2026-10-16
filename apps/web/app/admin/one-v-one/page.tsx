import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { OneVOneStatusBadge } from "@/components/one-v-one/OneVOneStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ADMIN_MATCH_PAGE_SIZE,
  isMatchFilter,
  listAdminMatches,
  type AdminMatchListItem,
  type MatchFilter,
} from "@/lib/admin/one-v-one-queries";
import { formatJstDateTime } from "@/lib/competition/period";

export const metadata: Metadata = { title: "1v1管理" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const FILTER_LABELS: Record<MatchFilter, string> = {
  recruiting: "募集中",
  pending_acceptance: "承認待ち",
  established: "成立済み",
  deleted: "削除済み",
};

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePage(value: string): number {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function pageHref(filter: MatchFilter | null, page: number): string {
  const params = new URLSearchParams();
  if (filter) params.set("status", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/one-v-one?${query}` : "/admin/one-v-one";
}

function MatchRow({ item }: { item: AdminMatchListItem }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/one-v-one/${item.id}`} className="block truncate font-medium underline underline-offset-2">
          {item.creator?.displayName ?? "不明"} vs {item.opponent?.displayName ?? "(未定)"}
        </Link>
        <p className="truncate text-xs text-foreground/70">
          {item.creatorChart ? `${item.creatorChart.title} (${item.creatorChart.difficultyType} ${item.creatorChart.level})` : "譜面不明"}
          {" / "}作成 {formatJstDateTime(item.createdAt)}
        </p>
      </div>
      {item.status ? (
        <OneVOneStatusBadge status={item.status} />
      ) : (
        <StatusBadge label="削除済み" className="border-border bg-foreground/5" />
      )}
    </li>
  );
}

async function MatchList({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const rawStatus = single(params.status);
  const filter = isMatchFilter(rawStatus) ? rawStatus : null;
  const page = parsePage(single(params.page));

  let result: Awaited<ReturnType<typeof listAdminMatches>>;
  try {
    result = await listAdminMatches(filter, page);
  } catch (cause) {
    console.error("[adminOneVOne]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">1v1情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_MATCH_PAGE_SIZE));

  return (
    <Card className="flex flex-col gap-4">
      <form action="/admin/one-v-one" className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          状態
          <select name="status" defaultValue={filter ?? ""} className="min-h-11 rounded-lg border border-border bg-surface px-2">
            <option value="">すべて(削除済みを除く)</option>
            {Object.entries(FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonStyles("secondary")}>
          絞り込み
        </button>
      </form>
      {result.items.length === 0 ? (
        <p className="text-sm">該当する対戦がありません。</p>
      ) : (
        <ul className="divide-y divide-border">
          {result.items.map((item) => (
            <MatchRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between text-sm">
        <span>
          {result.total}件中 {page} / {totalPages} ページ
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={pageHref(filter, page - 1)} className={buttonStyles("secondary")}>
              前へ
            </Link>
          )}
          {page < totalPages && (
            <Link href={pageHref(filter, page + 1)} className={buttonStyles("secondary")}>
              次へ
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AdminOneVOnePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <PageHeader title="1v1管理" />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <MatchList searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
