import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CompetitionForm } from "@/components/competition/CompetitionForm";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/current-user";
import { getDefaultPeriod } from "@/lib/competition/period";
import { getRatingClassOptions } from "@/lib/competition/queries";

export const metadata: Metadata = { title: "大会を作成" };

async function NewCompetition() {
  await requireUser();
  const ratingClasses = await getRatingClassOptions();
  const defaults = getDefaultPeriod(new Date());
  return (
    <Card>
      <CompetitionForm ratingClasses={ratingClasses} defaultStartAt={defaults.startAt} defaultEndAt={defaults.endAt} />
    </Card>
  );
}

export default function NewCompetitionPage() {
  return (
    <PageContainer>
      <PageHeader
        title="大会の作成"
        tone="competition"
        actions={
          <Link href="/competitions" className={buttonStyles("ghost")}>
            大会一覧へ
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-64 animate-pulse" aria-hidden="true" />}>
        <NewCompetition />
      </Suspense>
    </PageContainer>
  );
}
