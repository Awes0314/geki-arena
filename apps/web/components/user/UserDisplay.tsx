import Link from "next/link";

import { Avatar, type AvatarSize } from "@/components/ui/Avatar";
import { CourseBadge } from "@/components/user/CourseBadge";
import { RatingBadge } from "@/components/user/RatingBadge";

type UserDisplayProps = {
  userNo: number;
  displayName: string;
  iconUrl: string | null;
  ratingLabel?: string | null;
  badge?: { svgUrl: string; courseName: string } | null;
  size?: AvatarSize;
  /** trueでプロフィールへのリンクにする */
  linked?: boolean;
};

/** ランキング・参加者一覧など、ユーザーを表示する全箇所で使う共通コンポーネント。 */
export function UserDisplay({
  userNo,
  displayName,
  iconUrl,
  ratingLabel,
  badge,
  size = "md",
  linked = true,
}: UserDisplayProps) {
  const content = (
    <>
      <Avatar src={iconUrl} name={displayName} size={size} />
      <span className="truncate font-medium">{displayName}</span>
      {ratingLabel && <RatingBadge label={ratingLabel} />}
      {badge && <CourseBadge svgUrl={badge.svgUrl} courseName={badge.courseName} size={24} />}
    </>
  );

  const className = "inline-flex min-w-0 items-center gap-2";
  return linked ? (
    <Link href={`/users/${userNo}`} className={`${className} hover:underline`}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}
