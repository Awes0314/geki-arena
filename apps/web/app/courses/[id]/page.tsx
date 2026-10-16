import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CourseConditions, CourseStatusBadge } from "@/components/course/CourseConditions";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { buttonStyles } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { CourseBadge } from "@/components/user/CourseBadge";
import { requireUser } from "@/lib/auth/current-user";
import { formatChapter } from "@/lib/course-chapter";
import { getCourse } from "@/lib/course/queries";

export const metadata: Metadata = { title: "コース詳細" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function CourseContent({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  if (!UUID_PATTERN.test(id)) notFound();
  const course = await getCourse(id, user.id);
  if (!course) notFound();

  return (
    <>
      <PageHeader title={course.courseName} tone="course" />
      <div className="flex flex-col gap-4">
        <Card className="flex items-center gap-3 border-t-4 border-t-mode-course">
          {course.badgeChapter && <CourseBadge badgeChapter={course.badgeChapter} courseName={course.courseName} size={56} />}
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted">{formatChapter(course.chapter)}</span>
            <CourseStatusBadge result={course.myResult} />
          </div>
        </Card>
        <Card className="flex flex-col gap-3">
          <CardTitle>課題曲とクリア条件</CardTitle>
          <CourseConditions charts={course.charts} condition={course.clearCondition} />
        </Card>
        <Card className="flex flex-col gap-3">
          <CardTitle>挑戦する</CardTitle>
          <p className="text-sm">
            オンゲキNETで課題曲を連続して（間隔30分以内）プレイし、ブックマークレットを「コース」で実行してスコアを提出してください。
          </p>
          <Link href="/bookmarklet" className={buttonStyles("primary")}>
            スコア提出の手順を見る
          </Link>
        </Card>
      </div>
    </>
  );
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageContainer>
      <Suspense fallback={<p className="text-sm text-muted">読み込み中...</p>}>
        <CourseContent params={params} />
      </Suspense>
    </PageContainer>
  );
}
