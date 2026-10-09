import Link from "next/link";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/current-user";

async function HomeContent() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Card className="flex flex-col items-start gap-4">
        <p>Geki Arenaはオンゲキの非公式対戦プラットフォームです。ログインして利用を開始してください。</p>
        <Link href="/login" className={buttonStyles("primary")}>
          ログイン
        </Link>
        <Link href="/register" className={buttonStyles("secondary")}>
          新規登録
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-start gap-4">
      <p>ようこそ、{user.display_name}さん。</p>
      <Link href={`/users/${user.user_no}`} className={buttonStyles("secondary")}>
        プロフィールを見る
      </Link>
    </Card>
  );
}

export default function HomePage() {
  return (
    <PageContainer>
      <PageHeader title="ホーム" />
      <Suspense fallback={<Card className="h-28 animate-pulse" aria-hidden="true" />}>
        <HomeContent />
      </Suspense>
    </PageContainer>
  );
}
