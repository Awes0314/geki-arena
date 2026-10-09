/** Rating区分のバッジ。区分ごとの配色はマスタ確定後に追加する（components.md参照）。 */
export function RatingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
      {label}
    </span>
  );
}
