import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ReportList } from "@/components/admin/ReportList";
import { UserStatusBadge } from "@/components/admin/UserStatusBadge";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Fields";
import { formatJstDateTime } from "@/lib/competition/period";
import {
  ADMIN_USER_PAGE_SIZE,
  isUserStatus,
  listAdminUsers,
  listReports,
  type AdminReport,
  type AdminUser,
  type UserStatus,
} from "@/lib/admin/user-queries";

export const metadata: Metadata = { title: "ユーザー管理" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const OPEN_REPORT_LIMIT = 20;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePage(value: string): number {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function pageHref(keyword: string, status: UserStatus | null, page: number): string {
  const params = new URLSearchParams();
  if (keyword) params.set("q", keyword);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar src={user.icon_url} name={user.display_name} size="md" />
      <div className="min-w-0 flex-1">
        <Link href={`/admin/users/${user.user_no}`} className="block truncate font-medium underline underline-offset-2">
          {user.display_name}
        </Link>
        <p className="truncate text-xs text-foreground/70">
          No.{user.user_no} / @{user.user_id} / 登録 {formatJstDateTime(user.created_at)}
        </p>
      </div>
      {user.role === "admin" && <span className="text-xs font-semibold">運営</span>}
      <UserStatusBadge status={user.status} />
    </li>
  );
}

async function OpenReports() {
  let reports: AdminReport[];
  try {
    reports = await listReports({ status: "open", limit: OPEN_REPORT_LIMIT });
  } catch (cause) {
    console.error("[adminUsers]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">通報の取得に失敗しました。</Alert>;
  }
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold">未対応の通報</h2>
      <ReportList reports={reports} emptyText="未対応の通報はありません。" />
    </Card>
  );
}

async function UserList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const keyword = single(params.q).trim().slice(0, 50);
  const rawStatus = single(params.status);
  const status = isUserStatus(rawStatus) ? rawStatus : null;
  const page = parsePage(single(params.page));

  let result: Awaited<ReturnType<typeof listAdminUsers>>;
  try {
    result = await listAdminUsers(keyword, status, page);
  } catch (cause) {
    console.error("[adminUsers]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">ユーザー情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_USER_PAGE_SIZE));

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">ユーザー一覧</h2>
      <form action="/admin/users" className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <TextInput label="検索(ユーザーNo・ID・表示名)" name="q" defaultValue={keyword} maxLength={50} />
        </div>
        <label className="flex flex-col gap-1 text-sm">
          状態
          <select name="status" defaultValue={status ?? ""} className="min-h-11 rounded-lg border border-border bg-surface px-2">
            <option value="">すべて</option>
            <option value="active">有効</option>
            <option value="suspended">停止中</option>
            <option value="deleted">削除済み</option>
          </select>
        </label>
        <button type="submit" className={buttonStyles("secondary")}>
          検索
        </button>
      </form>
      {result.items.length === 0 ? (
        <p className="text-sm">該当するユーザーがいません。</p>
      ) : (
        <ul className="divide-y divide-border">
          {result.items.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between text-sm">
        <span>
          {result.total}件中 {page} / {totalPages} ページ
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={pageHref(keyword, status, page - 1)} className={buttonStyles("secondary")}>
              前へ
            </Link>
          )}
          {page < totalPages && (
            <Link href={pageHref(keyword, status, page + 1)} className={buttonStyles("secondary")}>
              次へ
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <PageHeader title="ユーザー管理" />
      <div className="flex flex-col gap-4">
        <Suspense fallback={<Card className="h-24 animate-pulse" aria-hidden="true" />}>
          <OpenReports />
        </Suspense>
        <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
          <UserList searchParams={searchParams} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
