import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ADMIN_LOG_PAGE_SIZE,
  listActivityLogs,
  listOperationLogs,
  type ActivityLogItem,
  type LogUser,
  type OperationLogItem,
} from "@/lib/admin/log-queries";
import { formatJstDateTime } from "@/lib/competition/period";
import { ACTIVITY_EVENT_TYPES } from "@/lib/logging/activity-log";
import { ACTIVITY_EVENT_LABELS, OPERATION_ACTION_LABELS } from "@/lib/logging/labels";
import { OPERATION_ACTION_TYPES } from "@/lib/logging/operation-log";

export const metadata: Metadata = { title: "ログ" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type LogKind = "activity" | "operation";

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePage(value: string): number {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function pageHref(kind: LogKind, filter: string | null, page: number): string {
  const params = new URLSearchParams({ kind });
  if (filter) params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  return `/admin/logs?${params.toString()}`;
}

function UserText({ user }: { user: LogUser | null }) {
  if (!user) return <span className="text-foreground/70">-</span>;
  return (
    <Link href={`/admin/users/${user.userNo}`} className="underline underline-offset-2">
      {user.displayName}
    </Link>
  );
}

function DetailText({ detail }: { detail: unknown }) {
  const text = JSON.stringify(detail);
  if (!text || text === "{}") return null;
  return <code className="block break-all text-xs text-foreground/70">{text}</code>;
}

function ActivityRow({ item }: { item: ActivityLogItem }) {
  return (
    <li className="flex flex-col gap-1 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={item.level === "error" ? "font-semibold text-red-600" : "font-medium"}>
          {ACTIVITY_EVENT_LABELS[item.eventType as keyof typeof ACTIVITY_EVENT_LABELS] ?? item.eventType}
        </span>
        <UserText user={item.user} />
        <span className="text-xs text-foreground/70">{formatJstDateTime(item.createdAt)}</span>
      </div>
      <DetailText detail={item.detail} />
    </li>
  );
}

function OperationRow({ item }: { item: OperationLogItem }) {
  return (
    <li className="flex flex-col gap-1 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">
          {OPERATION_ACTION_LABELS[item.actionType as keyof typeof OPERATION_ACTION_LABELS] ?? item.actionType}
        </span>
        <span>
          実行者 <UserText user={item.operator} />
        </span>
        <span className="text-xs text-foreground/70">{formatJstDateTime(item.createdAt)}</span>
      </div>
      <p className="break-all text-xs text-foreground/70">
        対象: {item.targetType} / {item.targetId}
      </p>
      <DetailText detail={item.detail} />
    </li>
  );
}

function KindTabs({ kind }: { kind: LogKind }) {
  const tabs: { kind: LogKind; label: string }[] = [
    { kind: "activity", label: "行動ログ" },
    { kind: "operation", label: "運営操作ログ" },
  ];
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.kind}
          href={pageHref(tab.kind, null, 1)}
          aria-current={tab.kind === kind ? "page" : undefined}
          className={buttonStyles(tab.kind === kind ? "primary" : "secondary")}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

async function LogList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const kind: LogKind = single(params.kind) === "operation" ? "operation" : "activity";
  const page = parsePage(single(params.page));
  const rawFilter = single(params.filter);

  const options: Record<string, string> =
    kind === "activity"
      ? Object.fromEntries(ACTIVITY_EVENT_TYPES.map((type) => [type, ACTIVITY_EVENT_LABELS[type]]))
      : Object.fromEntries(OPERATION_ACTION_TYPES.map((type) => [type, OPERATION_ACTION_LABELS[type]]));
  const filter = rawFilter in options ? rawFilter : null;

  let total: number;
  let rows: React.ReactNode[];
  try {
    if (kind === "activity") {
      const result = await listActivityLogs(filter, page);
      total = result.total;
      rows = result.items.map((item) => <ActivityRow key={item.id} item={item} />);
    } else {
      const result = await listOperationLogs(filter, page);
      total = result.total;
      rows = result.items.map((item) => <OperationRow key={item.id} item={item} />);
    }
  } catch (cause) {
    console.error("[adminLogs]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">ログの取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_LOG_PAGE_SIZE));

  return (
    <Card className="flex flex-col gap-4">
      <KindTabs kind={kind} />
      <form action="/admin/logs" className="flex items-end gap-2">
        <input type="hidden" name="kind" value={kind} />
        <label className="flex flex-col gap-1 text-sm">
          種別
          <select name="filter" defaultValue={filter ?? ""} className="min-h-11 rounded-lg border border-border bg-surface px-2">
            <option value="">すべて</option>
            {Object.entries(options).map(([value, label]) => (
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
      {rows.length === 0 ? (
        <p className="text-sm">該当するログがありません。</p>
      ) : (
        <ul className="divide-y divide-border">{rows}</ul>
      )}
      <div className="flex items-center justify-between text-sm">
        <span>
          {total}件中 {page} / {totalPages} ページ
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={pageHref(kind, filter, page - 1)} className={buttonStyles("secondary")}>
              前へ
            </Link>
          )}
          {page < totalPages && (
            <Link href={pageHref(kind, filter, page + 1)} className={buttonStyles("secondary")}>
              次へ
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <PageHeader title="ログ" />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <LogList searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
