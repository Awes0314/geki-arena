import Link from "next/link";

import { CompetitionActionForm } from "@/components/competition/CompetitionActionForm";
import { formatJstDateTime } from "@/lib/competition/period";
import { resolveReport } from "@/lib/admin/user-actions";
import type { AdminReport } from "@/lib/admin/user-queries";

function UserLink({ user }: { user: AdminReport["reporter"] }) {
  if (!user) return <span>不明</span>;
  return (
    <Link href={`/admin/users/${user.userNo}`} className="underline underline-offset-2">
      {user.displayName}
    </Link>
  );
}

/** 通報の一覧。未対応のものには対応済みボタンを表示する。 */
export function ReportList({ reports, emptyText }: { reports: AdminReport[]; emptyText: string }) {
  if (reports.length === 0) return <p className="text-sm text-foreground/70">{emptyText}</p>;

  return (
    <ul className="divide-y divide-border">
      {reports.map((report) => (
        <li key={report.id} className="flex flex-col gap-2 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/70">
            <span>{formatJstDateTime(report.createdAt)}</span>
            <span>
              通報者: <UserLink user={report.reporter} />
            </span>
            <span>
              対象: <UserLink user={report.reported} />
            </span>
            <span>{report.status === "open" ? "未対応" : "対応済み"}</span>
          </div>
          <p className="whitespace-pre-wrap break-words">{report.reason}</p>
          {report.status === "open" && (
            <CompetitionActionForm
              action={resolveReport}
              fields={{ reportId: report.id }}
              label="対応済みにする"
              pendingLabel="更新中..."
              variant="secondary"
            />
          )}
        </li>
      ))}
    </ul>
  );
}
