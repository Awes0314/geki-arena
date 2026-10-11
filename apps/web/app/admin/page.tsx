import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MasterSyncPanel } from "@/components/admin/MasterSyncPanel";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "運営ダッシュボード" };

async function AdminContent() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">楽曲・譜面マスタ</h2>
      <MasterSyncPanel />
    </Card>
  );
}

export default function AdminPage() {
  return (
    <PageContainer>
      <PageHeader title="運営ダッシュボード" />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <AdminContent />
      </Suspense>
    </PageContainer>
  );
}
