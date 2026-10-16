/** 大会・1v1などの状態表示に使う共通バッジ。色はclassNameで指定する。 */
export function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
