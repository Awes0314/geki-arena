import { RatingBadge } from "@/components/user/RatingBadge";

type RatingOption = { label: string; tier: string } | null;

/** Rating区分の範囲（参加条件・募集範囲）を表示する。両方未指定は「制限なし」。 */
export function RatingRangeText({ min, max }: { min: RatingOption; max: RatingOption }) {
  if (!min && !max) return <span>制限なし</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {min ? <RatingBadge label={min.label} tier={min.tier} /> : <span>指定なし</span>}
      <span>〜</span>
      {max ? <RatingBadge label={max.label} tier={max.tier} /> : <span>指定なし</span>}
    </span>
  );
}
