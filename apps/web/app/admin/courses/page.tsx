import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CourseBadge } from "@/components/user/CourseBadge";
import { listAdminCourses, type AdminCourseListItem } from "@/lib/admin/course-queries";
import { formatChapter } from "@/lib/course-chapter";

export const metadata: Metadata = { title: "コース管理" };

function CourseRow({ course }: { course: AdminCourseListItem }) {
  return (
    <li className="flex items-center gap-3 py-3">
      {course.badgeChapter && <CourseBadge badgeChapter={course.badgeChapter} courseName={course.courseName} size={36} />}
      <div className="min-w-0 flex-1">
        <Link href={`/admin/courses/${course.id}`} className="block truncate font-medium underline underline-offset-2">
          {course.courseName}
        </Link>
        <p className="text-xs text-foreground/70">
          {formatChapter(course.chapter)} / {course.chartCount}曲
        </p>
      </div>
    </li>
  );
}

async function CourseList() {
  let courses: AdminCourseListItem[];
  try {
    courses = await listAdminCourses();
  } catch (cause) {
    console.error("[adminCourses]", cause instanceof Error ? cause.message : cause);
    return <Alert variant="error">コース情報の取得に失敗しました。時間をおいて再度お試しください。</Alert>;
  }
  return (
    <Card>
      {courses.length === 0 ? (
        <p className="text-sm">コースがありません。</p>
      ) : (
        <ul className="divide-y divide-border">
          {courses.map((course) => (
            <CourseRow key={course.id} course={course} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function AdminCoursesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="コース管理"
        actions={
          <Link href="/admin/courses/new" className={buttonStyles("primary")}>
            コースを作成
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <CourseList />
      </Suspense>
    </PageContainer>
  );
}
