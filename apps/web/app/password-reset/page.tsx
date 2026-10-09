import type { Metadata } from "next";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { PasswordResetForm } from "./PasswordResetForm";

export const metadata: Metadata = { title: "パスワード再設定" };

export default function PasswordResetPage() {
  return (
    <PageContainer width="sm">
      <PageHeader title="パスワード再設定" />
      <Card>
        <PasswordResetForm />
      </Card>
    </PageContainer>
  );
}
