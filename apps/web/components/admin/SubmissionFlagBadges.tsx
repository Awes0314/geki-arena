import { StatusBadge } from "@/components/ui/StatusBadge";
import { SUBMISSION_FLAG_LABELS, type SubmissionFlag } from "@/lib/admin/submission-queries";

/** 要確認の理由を表示する。なければ何も表示しない。 */
export function SubmissionFlagBadges({ flags }: { flags: SubmissionFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {flags.map((flag) => (
        <StatusBadge
          key={flag}
          label={SUBMISSION_FLAG_LABELS[flag]}
          className="border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300"
        />
      ))}
    </span>
  );
}
