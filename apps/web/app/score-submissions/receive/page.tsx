import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { buttonStyles } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/current-user";

import { ScoreReceiver } from "./ScoreReceiver";

export const metadata: Metadata = { title: "スコア提出確認" };

async function ReceiveContent() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Card className="flex flex-col gap-4">
        <Alert variant="info">
          ログインが必要です。ログイン後、受信したデータは保持されないため、オンゲキNETでブックマークレットを再実行してください。
        </Alert>
        <Link href="/login" className={buttonStyles("primary")}>
          ログインへ
        </Link>
      </Card>
    );
  }
  return <ScoreReceiver />;
}

export default function ScoreReceivePage() {
  return (
    <PageContainer>
      <PageHeader title="スコア提出確認" />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <ReceiveContent />
      </Suspense>
    </PageContainer>
  );
}
