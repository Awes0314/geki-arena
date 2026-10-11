import type { Metadata } from "next";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/current-user";

import { BookmarkletCopy } from "./BookmarkletCopy";

export const metadata: Metadata = { title: "スコア提出ブックマークレット" };

async function BookmarkletContent() {
  await requireUser();
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">登録手順</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>下のボタンでブックマークレットをコピーする。</li>
          <li>ブラウザで任意のページをブックマークし、ブックマークのURL欄をコピーした内容に書き換えて保存する。</li>
        </ol>
        <BookmarkletCopy />
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">実行手順</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>オンゲキNETにログインする。</li>
          <li>登録したブックマークを開く（モバイルではアドレスバーにブックマーク名を入力して選択）。</li>
          <li>「大会・1v1」または「コース」を選択する。</li>
          <li>別タブで開く提出確認ページで内容を確認する。</li>
        </ol>
      </Card>
    </div>
  );
}

export default function BookmarkletPage() {
  return (
    <PageContainer>
      <PageHeader title="スコア提出" />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <BookmarkletContent />
      </Suspense>
    </PageContainer>
  );
}
