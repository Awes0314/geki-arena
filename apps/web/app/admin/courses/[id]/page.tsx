import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { CourseForm } from "@/components/admin/CourseForm";
import { CompetitionActionForm } from "@/components/competition/CompetitionActionForm";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { deleteCourse } from "@/lib/admin/course-actions";
import { getAdminCourse, type AdminCourseDetail } from "@/lib/admin/course-queries";

export const metadata: Metadata = { title: "コース詳細(運営)" };

function Detail({ course }: { course: AdminCourseDetail }) {
  const hasResults = course.resultCount > 0;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-2 text-base font-semibold">挑戦状況</h2>
        <p className="text-sm">
          挑戦者 {course.resultCount}人 / クリア {course.clearedCount}人
        </p>
      </Card>

      <CourseForm
        courseId={course.id}
        chartsLocked={hasResults}
        defaults={{
          courseName: course.courseName,
          chapter: course.chapter,
          badgeChapter: course.badgeChapter ?? "1",
          clearCondition: course.clearCondition,
          charts: course.charts,
        }}
      />

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">コースの削除</h2>
        {hasResults ? (
          <p className="text-sm">挑戦結果があるコースは削除できません。</p>
        ) : (
          <>
            <p className="text-sm">削除したコースは元に戻せません。</p>
            <CompetitionActionForm
              action={deleteCourse}
              fields={{ courseId: course.id }}
              label="コースを削除"
              pendingLabel="削除中..."
              variant="danger"
              confirmMessage={`「${course.courseName}」を削除します。よろしいですか？`}
            />
          </>
        )}
      </Card>
    </div>
  );
}

async function CourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  let course: AdminCourseDetail | null;
  try {
    course = await getAdminCourse(id);
  } catch (cause) {
    console.error("[adminCourseDetail]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">コース情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  if (!course) notFound();
  return <Detail course={course} />;
}

export default function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageContainer>
      <PageHeader
        title="コース詳細(運営)"
        actions={
          <Link href="/admin/courses" className={buttonStyles("secondary")}>
            一覧へ
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <CourseDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}
