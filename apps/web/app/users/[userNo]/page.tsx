import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { buttonStyles } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { CourseBadge } from "@/components/user/CourseBadge";
import { RatingBadge } from "@/components/user/RatingBadge";
import { SnsLinks } from "@/components/user/SnsLinks";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProfileByUserNo } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "プロフィール" };

async function ProfileContent({ params }: { params: Promise<{ userNo: string }> }) {
  const { userNo: rawUserNo } = await params;
  // bigintの範囲外・不正値は存在しないユーザーとして扱う
  if (!/^[1-9]\d{0,14}$/.test(rawUserNo)) notFound();

  const [profile, currentUser] = await Promise.all([
    getProfileByUserNo(Number(rawUserNo)),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const isOwn = currentUser?.id === profile.id;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Avatar src={profile.iconUrl} name={profile.displayName} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
          <h1 className="max-w-full break-words text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-muted">No. {profile.userNo}</p>
          <div className="flex items-center gap-2">
            {profile.ratingClass && <RatingBadge label={profile.ratingClass.label} />}
            {profile.displayedBadge && (
              <CourseBadge svgUrl={profile.displayedBadge.svgUrl} courseName={profile.displayedBadge.courseName} />
            )}
          </div>
        </div>
        {isOwn && (
          <Link href="/profile/edit" className={buttonStyles("secondary")}>
            プロフィールを編集
          </Link>
        )}
      </Card>

      <Card>
        <CardTitle>自己紹介</CardTitle>
        {profile.bio ? (
          <p className="whitespace-pre-wrap break-words text-sm">{profile.bio}</p>
        ) : (
          <p className="text-sm text-muted">未設定</p>
        )}
      </Card>

      <Card>
        <CardTitle>外部SNS</CardTitle>
        <SnsLinks links={profile.snsLinks} />
      </Card>

      <Card>
        <CardTitle>過去戦績</CardTitle>
        <p className="text-sm text-muted">大会・1v1の戦績は今後ここに表示されます。</p>
      </Card>
    </div>
  );
}

export default function UserProfilePage({ params }: PageProps<"/users/[userNo]">) {
  return (
    <PageContainer>
      <Suspense fallback={<Card className="h-48 animate-pulse" aria-hidden="true" />}>
        <ProfileContent params={params} />
      </Suspense>
    </PageContainer>
  );
}
