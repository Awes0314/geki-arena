import { STATUS_LABELS, type CompetitionStatus } from "@/lib/competition/period";

const STATUS_CLASS: Record<CompetitionStatus, string> = {
  scheduled: "border-yellow-300 bg-yellow-600 text-yellow-50",
  ongoing: "border-green-300 bg-green-600 text-green-50",
  finished: "border-gray-300 bg-gray-600 text-gray-50",
};

export function CompetitionStatusBadge({ status }: { status: CompetitionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
