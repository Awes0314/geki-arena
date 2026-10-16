import { StatusBadge } from "@/components/ui/StatusBadge";
import { ONE_V_ONE_STATUS_LABELS, type OneVOneStatus } from "@/lib/one-v-one/status";

const STATUS_CLASS: Record<OneVOneStatus, string> = {
  recruiting: "border-emerald-300 bg-emerald-600 text-emerald-50",
  pending_acceptance: "border-yellow-300 bg-yellow-600 text-yellow-50",
  established: "border-teal-300 bg-teal-700 text-teal-50",
  finished: "border-gray-300 bg-gray-600 text-gray-50",
  expired: "border-gray-300 bg-gray-500 text-gray-50",
};

export function OneVOneStatusBadge({ status }: { status: OneVOneStatus }) {
  return <StatusBadge label={ONE_V_ONE_STATUS_LABELS[status]} className={STATUS_CLASS[status]} />;
}
