import type { Metadata } from "next";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "新規登録" };

export default function RegisterPage() {
  return (
    <PageContainer width="sm">
      <PageHeader title="新規登録" />
      <Card>
        <RegisterForm />
      </Card>
    </PageContainer>
  );
}
