import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { OneVOneForm } from "@/components/one-v-one/OneVOneForm";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/current-user";
import { getRatingClassOptions } from "@/lib/competition/queries";

export const metadata: Metadata = { title: "1v1を作成" };

async function NewOneVOne() {
  await requireUser();
  const ratingClasses = await getRatingClassOptions();
  return (
    <Card>
      <OneVOneForm ratingClasses={ratingClasses} />
    </Card>
  );
}

export default function NewOneVOnePage() {
  return (
    <PageContainer>
      <PageHeader
        title="1v1の作成"
        tone="one-v-one"
        actions={
          <Link href="/one-v-one" className={buttonStyles("ghost")}>
            1v1一覧へ
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-64 animate-pulse" aria-hidden="true" />}>
        <NewOneVOne />
      </Suspense>
    </PageContainer>
  );
}
