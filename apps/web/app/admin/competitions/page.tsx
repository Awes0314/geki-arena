import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { CompetitionStatusBadge } from "@/components/competition/CompetitionStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Fields";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ADMIN_COMPETITION_PAGE_SIZE,
  isCompetitionFilter,
  listAdminCompetitions,
  type AdminCompetitionListItem,
  type CompetitionFilter,
} from "@/lib/admin/competition-queries";
import { formatJstDateTime } from "@/lib/competition/period";

export const metadata: Metadata = { title: "大会管理" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePage(value: string): number {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function pageHref(keyword: string, filter: CompetitionFilter | null, page: number): string {
  const params = new URLSearchParams();
  if (keyword) params.set("q", keyword);
  if (filter) params.set("status", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/competitions?${query}` : "/admin/competitions";
}

function CompetitionRow({ item }: { item: AdminCompetitionListItem }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/competitions/${item.id}`} className="block truncate font-medium underline underline-offset-2">
          {item.name}
        </Link>
        <p className="truncate text-xs text-foreground/70">
          主催 {item.organizer?.displayName ?? "不明"} / {formatJstDateTime(item.startAt)} 〜 {formatJstDateTime(item.endAt)}
        </p>
      </div>
      {item.deleted ? (
        <StatusBadge label="削除済み" className="border-border bg-foreground/5" />
      ) : (
        <CompetitionStatusBadge status={item.status} />
      )}
    </li>
  );
}

async function CompetitionList({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const keyword = single(params.q).trim().slice(0, 50);
  const rawStatus = single(params.status);
  const filter = isCompetitionFilter(rawStatus) ? rawStatus : null;
  const page = parsePage(single(params.page));

  let result: Awaited<ReturnType<typeof listAdminCompetitions>>;
  try {
    result = await listAdminCompetitions(keyword, filter, page);
  } catch (cause) {
    console.error("[adminCompetitions]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">大会情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_COMPETITION_PAGE_SIZE));

  return (
    <Card className="flex flex-col gap-4">
      <form action="/admin/competitions" className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <TextInput label="大会名で検索" name="q" defaultValue={keyword} maxLength={50} />
        </div>
        <label className="flex flex-col gap-1 text-sm">
          状態
          <select name="status" defaultValue={filter ?? ""} className="min-h-11 rounded-lg border border-border bg-surface px-2">
            <option value="">すべて(削除済みを除く)</option>
            <option value="scheduled">開催予定</option>
            <option value="ongoing">開催中</option>
            <option value="finished">終了</option>
            <option value="deleted">削除済み</option>
          </select>
        </label>
        <button type="submit" className={buttonStyles("secondary")}>
          検索
        </button>
      </form>
      {result.items.length === 0 ? (
        <p className="text-sm">該当する大会がありません。</p>
      ) : (
        <ul className="divide-y divide-border">
          {result.items.map((item) => (
            <CompetitionRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between text-sm">
        <span>
          {result.total}件中 {page} / {totalPages} ページ
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={pageHref(keyword, filter, page - 1)} className={buttonStyles("secondary")}>
              前へ
            </Link>
          )}
          {page < totalPages && (
            <Link href={pageHref(keyword, filter, page + 1)} className={buttonStyles("secondary")}>
              次へ
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AdminCompetitionsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <PageHeader title="大会管理" />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <CompetitionList searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
