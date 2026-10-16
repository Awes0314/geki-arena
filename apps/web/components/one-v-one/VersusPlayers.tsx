import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { CourseBadge } from "@/components/user/CourseBadge";
import { RatingBadge } from "@/components/user/RatingBadge";
import type { UserSummary } from "@/lib/competition/queries";

const ICON_PX = 96;

function Player({ user, emptyLabel }: { user: UserSummary | null; emptyLabel: string }) {
  if (!user) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center rounded-full border border-dashed border-border text-2xl text-muted"
          style={{ width: ICON_PX, height: ICON_PX }}
        >
          ?
        </span>
        <span className="text-sm font-medium text-muted">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <Link
      href={`/users/${user.userNo}`}
      className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1 text-center hover:underline"
    >
      <span className="relative inline-flex">
        <Avatar src={user.iconUrl} name={user.displayName} size="lg" />
        {user.badge && (
          <span className="absolute -bottom-1 -right-1">
            <CourseBadge badgeChapter={user.badge.badgeChapter} courseName={user.badge.courseName} size={28} />
          </span>
        )}
      </span>
      <span className="max-w-full truncate text-sm font-medium">{user.displayName}</span>
      {user.rating && <RatingBadge label={user.rating.label} tier={user.rating.tier} />}
    </Link>
  );
}

/** 1v1の2人を左右対称に並べる固有部品。対戦相手が未定の場合はダミー表示にする。 */
export function VersusPlayers({ creator, opponent }: { creator: UserSummary | null; opponent: UserSummary | null }) {
  return (
    <div className="flex items-start gap-2">
      <Player user={creator} emptyLabel="不明" />
      <span className="self-center text-lg font-bold tracking-wide text-mode-one-v-one">VS</span>
      <Player user={opponent} emptyLabel="募集中" />
    </div>
  );
}
