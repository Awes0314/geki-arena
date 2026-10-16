import { StatusBadge } from "@/components/ui/StatusBadge";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: { label: "有効", className: "border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-300" },
  suspended: { label: "停止中", className: "border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-300" },
  deleted: { label: "削除済み", className: "border-border bg-foreground/5" },
};

export function UserStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { label: status, className: "border-border" };
  return <StatusBadge label={style.label} className={style.className} />;
}
