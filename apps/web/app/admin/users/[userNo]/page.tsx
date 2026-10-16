import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ReportList } from "@/components/admin/ReportList";
import { UserStatusBadge } from "@/components/admin/UserStatusBadge";
import { CompetitionActionForm } from "@/components/competition/CompetitionActionForm";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAdminUser } from "@/lib/admin/guard";
import { suspendUser, unsuspendUser } from "@/lib/admin/user-actions";
import { getAdminUserByUserNo, listReports, listUserActivity, type AdminUser } from "@/lib/admin/user-queries";
import { formatJstDateTime } from "@/lib/competition/period";
import type { ActivityEventType } from "@/lib/logging/activity-log";
import { ACTIVITY_EVENT_LABELS } from "@/lib/logging/labels";

export const metadata: Metadata = { title: "ユーザー詳細" };

const REPORT_LIMIT = 50;
const ACTIVITY_LIMIT = 20;

function StatusActions({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  if (isSelf) return <p className="text-sm text-foreground/70">自分自身は操作できません。</p>;
  if (user.role === "admin") return <p className="text-sm text-foreground/70">運営ユーザーは操作できません。</p>;
  if (user.status === "active") {
    return (
      <CompetitionActionForm
        action={suspendUser}
        fields={{ userId: user.id }}
        label="アカウントを停止"
        pendingLabel="停止中..."
        variant="danger"
        confirmMessage={`${user.display_name} のアカウントを停止します。よろしいですか？`}
        successMessage="停止しました"
      />
    );
  }
  if (user.status === "suspended") {
    return (
      <CompetitionActionForm
        action={unsuspendUser}
        fields={{ userId: user.id }}
        label="停止を解除"
        pendingLabel="解除中..."
        successMessage="解除しました"
      />
    );
  }
  return <p className="text-sm text-foreground/70">削除済みのアカウントは操作できません。</p>;
}

async function UserDetail({ params }: { params: Promise<{ userNo: string }> }) {
  const { userNo: rawUserNo } = await params;
  if (!/^[1-9]\d{0,14}$/.test(rawUserNo)) notFound();

  let user: AdminUser | null;
  try {
    user = await getAdminUserByUserNo(Number(rawUserNo));
  } catch (cause) {
    console.error("[adminUserDetail]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">ユーザー情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  if (!user) notFound();

  const operator = await getAdminUser();
  const [reports, activity] = await Promise.all([
    listReports({ reportedUserId: user.id, limit: REPORT_LIMIT }).catch(() => null),
    listUserActivity(user.id, ACTIVITY_LIMIT).catch(() => null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-4">
        <Avatar src={user.icon_url} name={user.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold">{user.display_name}</h2>
          <p className="text-sm text-foreground/70">
            No.{user.user_no} / @{user.user_id} / 登録 {formatJstDateTime(user.created_at)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <UserStatusBadge status={user.status} />
            {user.role === "admin" && <span className="text-xs font-semibold">運営</span>}
          </div>
        </div>
        <Link href={`/users/${user.user_no}`} className={buttonStyles("secondary")}>
          公開プロフィール
        </Link>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">アカウント操作</h2>
        <StatusActions user={user} isSelf={operator?.id === user.id} />
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">このユーザーへの通報</h2>
        {reports ? (
          <ReportList reports={reports} emptyText="通報はありません。" />
        ) : (
          <Alert variant="error">通報の取得に失敗しました。</Alert>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">直近の行動ログ</h2>
        {!activity ? (
          <Alert variant="error">行動ログの取得に失敗しました。</Alert>
        ) : activity.length === 0 ? (
          <p className="text-sm text-foreground/70">行動ログはありません。</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {activity.map((log) => (
              <li key={log.id} className="flex justify-between gap-4 py-2">
                <span>{ACTIVITY_EVENT_LABELS[log.event_type as ActivityEventType] ?? log.event_type}</span>
                <span className="text-foreground/70">{formatJstDateTime(log.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ userNo: string }> }) {
  return (
    <PageContainer>
      <PageHeader
        title="ユーザー詳細"
        actions={
          <Link href="/admin/users" className={buttonStyles("secondary")}>
            一覧へ
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <UserDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}
