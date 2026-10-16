import type { Metadata } from "next";
import Link from "next/link";

import { CourseForm } from "@/components/admin/CourseForm";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { buttonStyles } from "@/components/ui/Button";

export const metadata: Metadata = { title: "コース作成" };

export default function AdminNewCoursePage() {
  return (
    <PageContainer>
      <PageHeader
        title="コース作成"
        actions={
          <Link href="/admin/courses" className={buttonStyles("secondary")}>
            一覧へ
          </Link>
        }
      />
      <CourseForm />
    </PageContainer>
  );
}
