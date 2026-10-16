import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CourseConditions, CourseStatusBadge } from "@/components/course/CourseConditions";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { CourseBadge } from "@/components/user/CourseBadge";
import { requireUser } from "@/lib/auth/current-user";
import { formatChapter } from "@/lib/course-chapter";
import { listCourses, type CourseView } from "@/lib/course/queries";
import { MODE_TONE_CLASS } from "@/lib/mode-tone";

export const metadata: Metadata = { title: "コース一覧" };

function CourseCard({ course }: { course: CourseView }) {
  return (
    <Card className={`flex flex-col gap-3 ${MODE_TONE_CLASS.course.cardBorder}`}>
      <div className="flex items-center gap-3">
        {course.badgeChapter && <CourseBadge badgeChapter={course.badgeChapter} courseName={course.courseName} size={40} />}
        <h3 className="min-w-0 flex-1 text-base font-semibold">
          <Link href={`/courses/${course.id}`} className="underline-offset-2 hover:underline">
            {course.courseName}
          </Link>
        </h3>
        <CourseStatusBadge result={course.myResult} />
      </div>
      <p className="text-xs text-muted">{course.charts.length}曲</p>
      <CourseConditions charts={course.charts} condition={course.clearCondition} />
    </Card>
  );
}

async function CourseList() {
  const user = await requireUser();
  const courses = await listCourses(user.id);
  if (courses.length === 0) return <p className="text-sm text-muted">コースはまだありません。</p>;

  const chapters = new Map<string, CourseView[]>();
  for (const course of courses) chapters.set(course.chapter, [...(chapters.get(course.chapter) ?? []), course]);

  return (
    <div className="flex flex-col gap-8">
      {[...chapters].map(([chapter, items]) => (
        <section key={chapter} className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{formatChapter(chapter)}</h2>
          {items.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </section>
      ))}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <PageContainer>
      <PageHeader title="コース" tone="course" />
      <Suspense fallback={<p className="text-sm text-muted">読み込み中...</p>}>
        <CourseList />
      </Suspense>
    </PageContainer>
  );
}
