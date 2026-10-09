import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/current-user";
import { getClearedBadges, getProfileByUserNo, getRatingClasses } from "@/lib/profile/queries";
import { ProfileEditForm } from "./ProfileEditForm";

export const metadata: Metadata = { title: "プロフィール編集" };

async function EditContent({ searchParams }: { searchParams: Promise<{ onboarding?: string | string[] }> }) {
  const [user, { onboarding: onboardingParam }] = await Promise.all([requireUser(), searchParams]);
  const onboarding = onboardingParam === "1";

  const [profile, ratingClasses, badges] = await Promise.all([
    getProfileByUserNo(user.user_no),
    getRatingClasses(),
    onboarding ? Promise.resolve([]) : getClearedBadges(user.id),
  ]);
  if (!profile) notFound();

  return (
    <>
      <PageHeader
        title={onboarding ? "プロフィールを設定" : "プロフィール編集"}
        actions={
          <Link href={onboarding ? "/" : `/users/${user.user_no}`} className={buttonStyles("ghost")}>
            {onboarding ? "スキップ" : "戻る"}
          </Link>
        }
      />
      <Card>
        <ProfileEditForm profile={profile} ratingClasses={ratingClasses} badges={badges} onboarding={onboarding} />
      </Card>
    </>
  );
}

export default function ProfileEditPage({ searchParams }: PageProps<"/profile/edit">) {
  return (
    <PageContainer width="sm">
      <Suspense fallback={<Card className="h-64 animate-pulse" aria-hidden="true" />}>
        <EditContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
