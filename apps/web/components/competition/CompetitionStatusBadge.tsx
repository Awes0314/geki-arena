import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_LABELS, type CompetitionStatus } from "@/lib/competition/period";

const STATUS_CLASS: Record<CompetitionStatus, string> = {
  scheduled: "border-yellow-300 bg-yellow-600 text-yellow-50",
  ongoing: "border-green-300 bg-green-600 text-green-50",
  finished: "border-gray-300 bg-gray-600 text-gray-50",
};

export function CompetitionStatusBadge({ status }: { status: CompetitionStatus }) {
  return <StatusBadge label={STATUS_LABELS[status]} className={STATUS_CLASS[status]} />;
}
