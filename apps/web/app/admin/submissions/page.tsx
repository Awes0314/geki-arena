import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SubmissionFlagBadges } from "@/components/admin/SubmissionFlagBadges";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ADMIN_SUBMISSION_PAGE_SIZE,
  isSubmissionContext,
  listAdminSubmissions,
  type AdminSubmissionListItem,
  type SubmissionContext,
} from "@/lib/admin/submission-queries";
import { SUBMISSION_CONTEXT_LABELS } from "@/lib/admin/submission-labels";
import { formatJstDateTime } from "@/lib/competition/period";

export const metadata: Metadata = { title: "提出管理" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePage(value: string): number {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function pageHref(context: SubmissionContext | null, anomalyOnly: boolean, page: number): string {
  const params = new URLSearchParams();
  if (context) params.set("context", context);
  if (anomalyOnly) params.set("anomaly", "1");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/submissions?${query}` : "/admin/submissions";
}

function SubmissionRow({ item }: { item: AdminSubmissionListItem }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/submissions/${item.id}`} className="block truncate font-medium underline underline-offset-2">
          {item.submitter?.displayName ?? "不明"} / {item.totalScore.toLocaleString("ja-JP")}
        </Link>
        <p className="truncate text-xs text-foreground/70">
          {SUBMISSION_CONTEXT_LABELS[item.contextType]} / {formatJstDateTime(item.submittedAt)}
        </p>
      </div>
      <SubmissionFlagBadges flags={item.flags} />
    </li>
  );
}

async function SubmissionList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawContext = single(params.context);
  const context = isSubmissionContext(rawContext) ? rawContext : null;
  const anomalyOnly = single(params.anomaly) === "1";
  const page = parsePage(single(params.page));

  let result: Awaited<ReturnType<typeof listAdminSubmissions>>;
  try {
    result = await listAdminSubmissions(context, anomalyOnly, page);
  } catch (cause) {
    console.error("[adminSubmissions]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">提出情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_SUBMISSION_PAGE_SIZE));

  return (
    <Card className="flex flex-col gap-4">
      <form action="/admin/submissions" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          提出先
          <select name="context" defaultValue={context ?? ""} className="min-h-11 rounded-lg border border-border bg-surface px-2">
            <option value="">すべて</option>
            {Object.entries(SUBMISSION_CONTEXT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="anomaly" value="1" defaultChecked={anomalyOnly} />
          要確認のみ
        </label>
        <button type="submit" className={buttonStyles("secondary")}>
          絞り込み
        </button>
      </form>
      {result.items.length === 0 ? (
        <p className="text-sm">該当する提出がありません。</p>
      ) : (
        <ul className="divide-y divide-border">
          {result.items.map((item) => (
            <SubmissionRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between text-sm">
        <span>
          {result.total}件中 {page} / {totalPages} ページ
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={pageHref(context, anomalyOnly, page - 1)} className={buttonStyles("secondary")}>
              前へ
            </Link>
          )}
          {page < totalPages && (
            <Link href={pageHref(context, anomalyOnly, page + 1)} className={buttonStyles("secondary")}>
              次へ
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AdminSubmissionsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <PageHeader title="提出管理" />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <SubmissionList searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
