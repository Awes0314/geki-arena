import Link from "next/link";

import { MatchCharts } from "@/components/one-v-one/MatchCharts";
import { OneVOneStatusBadge } from "@/components/one-v-one/OneVOneStatusBadge";
import { VersusPlayers } from "@/components/one-v-one/VersusPlayers";
import { Card } from "@/components/ui/Card";
import { RatingRangeText } from "@/components/user/RatingRangeText";
import { formatJstDateTime } from "@/lib/competition/period";
import type { OneVOneListItem } from "@/lib/one-v-one/queries";
import { getRecruitmentDeadline } from "@/lib/one-v-one/status";
import { MODE_TONE_CLASS } from "@/lib/mode-tone";

/** カード右上のたすき掛け表示。作成と参加が両立する場合は作成を優先する。 */
function RelationRibbon({ match }: { match: OneVOneListItem }) {
  if (!match.isCreator && !match.isOpponent) return null;
  return (
    <span
      className={`absolute right-[-34px] top-5 w-32 rotate-45 py-1 text-center text-xs font-bold text-white shadow-sm ${
        match.isCreator ? "bg-orange-600" : "bg-blue-600"
      }`}
    >
      {match.isCreator ? "作成" : "参加"}
    </span>
  );
}

/** 1v1一覧のカード。 */
export function MatchCard({ match }: { match: OneVOneListItem }) {
  const hasRelation = match.isCreator || match.isOpponent;
  const waiting = match.status === "recruiting" || match.status === "pending_acceptance";

  return (
    <Card className={`relative flex flex-col gap-3 overflow-hidden ${MODE_TONE_CLASS["one-v-one"].cardBorder}`}>
      <RelationRibbon match={match} />
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${hasRelation ? "pr-12" : ""}`}>
        <OneVOneStatusBadge status={match.status} />
        {match.endAt && (
          <span className="text-sm text-muted">
            {match.startAt && `${formatJstDateTime(match.startAt)} 〜 `}
            {formatJstDateTime(match.endAt)}
          </span>
        )}
        {waiting && (
          <span className="text-sm text-muted">{formatJstDateTime(getRecruitmentDeadline(match.createdAt))} まで受付</span>
        )}
      </div>
      <Link
        href={`/one-v-one/${match.id}`}
        aria-label="1v1の詳細を見る"
        className="after:absolute after:inset-0 after:content-['']"
      />
      <VersusPlayers creator={match.creator} opponent={match.opponent} />
      {match.status === "recruiting" && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-muted">募集Rating区分:</span>
          <RatingRangeText min={match.ratingMin} max={match.ratingMax} />
        </div>
      )}
      <hr className="border-border" />
      <MatchCharts match={match} />
    </Card>
  );
}
