import "server-only";

import { compareChapters } from "@/lib/course-chapter";
import { readClearCondition, type ClearCondition } from "@/lib/course-condition";
import type { BadgeChapter } from "@/lib/course-badge";
import { isBadgeChapter } from "@/lib/course-badge";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminCourseListItem = {
  id: string;
  chapter: string;
  courseName: string;
  badgeChapter: BadgeChapter | null;
  chartCount: number;
};

export type AdminCourseChart = {
  chartId: string;
  title: string;
  difficulty: string;
  level: string;
  chartConstant: number;
  jacketImageUrl: string | null;
};

export type AdminCourseDetail = {
  id: string;
  chapter: string;
  courseName: string;
  badgeChapter: BadgeChapter | null;
  charts: AdminCourseChart[];
  clearCondition: ClearCondition;
  /** 挑戦結果(cleared/failed)の件数 */
  resultCount: number;
  clearedCount: number;
};

type ChartRow = {
  order_index: number;
  chart: {
    id: string;
    difficulty_type: string;
    level: string;
    chart_constant: number;
    jacket_image_url: string | null;
    music: { title: string } | null;
  } | null;
};

const head = { count: "exact", head: true } as const;

/** 全コースをチャプター順（数値→記号）、同チャプター内は名前順で取得する。 */
export async function listAdminCourses(): Promise<AdminCourseListItem[]> {
  const { data, error } = await createAdminClient()
    .from("courses")
    .select("id, chapter, course_name, badge:course_badges!course_badges_course_id_fkey(badge_chapter), course_charts(chart_id)")
    .overrideTypes<
      {
        id: string;
        chapter: string;
        course_name: string;
        badge: { badge_chapter: string } | null;
        course_charts: { chart_id: string }[];
      }[],
      { merge: false }
    >();
  if (error) throw new Error(`failed to fetch courses: ${error.message}`);

  return (data ?? [])
    .map((row) => ({
      id: row.id,
      chapter: row.chapter,
      courseName: row.course_name,
      badgeChapter: row.badge && isBadgeChapter(row.badge.badge_chapter) ? row.badge.badge_chapter : null,
      chartCount: row.course_charts.length,
    }))
    .sort((a, b) => compareChapters(a.chapter, b.chapter) || a.courseName.localeCompare(b.courseName, "ja"));
}

/** コースの詳細。存在しない場合はnull。 */
export async function getAdminCourse(id: string): Promise<AdminCourseDetail | null> {
  const admin = createAdminClient();
  const [course, badge, charts, results, cleared] = await Promise.all([
    admin.from("courses").select("id, chapter, course_name, clear_condition").eq("id", id).maybeSingle(),
    admin.from("course_badges").select("badge_chapter").eq("course_id", id).maybeSingle(),
    admin
      .from("course_charts")
      .select("order_index, chart:charts(id, difficulty_type, level, chart_constant, jacket_image_url, music:musics(title))")
      .eq("course_id", id)
      .order("order_index")
      .overrideTypes<ChartRow[], { merge: false }>(),
    admin.from("course_challenge_results").select("user_id", head).eq("course_id", id),
    admin.from("course_challenge_results").select("user_id", head).eq("course_id", id).eq("result", "cleared"),
  ]);
  const error = course.error ?? badge.error ?? charts.error ?? results.error ?? cleared.error;
  if (error) throw new Error(`failed to fetch course: ${error.message}`);
  if (!course.data) return null;

  const chartList = (charts.data ?? []).flatMap((row): AdminCourseChart[] =>
    row.chart
      ? [
          {
            chartId: row.chart.id,
            title: row.chart.music?.title ?? "(不明)",
            difficulty: row.chart.difficulty_type,
            level: row.chart.level,
            chartConstant: row.chart.chart_constant,
            jacketImageUrl: row.chart.jacket_image_url,
          },
        ]
      : [],
  );
  return {
    id: course.data.id,
    chapter: course.data.chapter,
    courseName: course.data.course_name,
    badgeChapter: badge.data && isBadgeChapter(badge.data.badge_chapter) ? badge.data.badge_chapter : null,
    charts: chartList,
    clearCondition: readClearCondition(course.data.clear_condition, chartList.length),
    resultCount: results.count ?? 0,
    clearedCount: cleared.count ?? 0,
  };
}
