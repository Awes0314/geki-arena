import "server-only";

import { compareChapters } from "@/lib/course-chapter";
import { readClearCondition, type ClearCondition } from "@/lib/course-condition";
import { isBadgeChapter, type BadgeChapter } from "@/lib/course-badge";
import { createClient } from "@/lib/supabase/server";

export type CourseChart = {
  chartId: string;
  title: string;
  difficulty: string;
  level: string;
  chartConstant: number;
};

/** 自身の挑戦状況。未挑戦はnull。 */
export type MyCourseResult = { result: "cleared" | "failed"; achievedAt: string | null } | null;

export type CourseView = {
  id: string;
  chapter: string;
  courseName: string;
  badgeChapter: BadgeChapter | null;
  charts: CourseChart[];
  clearCondition: ClearCondition;
  myResult: MyCourseResult;
};

type CourseRow = {
  id: string;
  chapter: string;
  course_name: string;
  clear_condition: unknown;
  badge: { badge_chapter: string } | null;
  course_charts: {
    order_index: number;
    chart: {
      id: string;
      difficulty_type: string;
      level: string;
      chart_constant: number;
      music: { title: string } | null;
    } | null;
  }[];
};

const COURSE_SELECT = `id, chapter, course_name, clear_condition,
  badge:course_badges!course_badges_course_id_fkey(badge_chapter),
  course_charts(order_index, chart:charts(id, difficulty_type, level, chart_constant, music:musics(title)))`;

function toCourseView(row: CourseRow, myResult: MyCourseResult): CourseView {
  const charts = [...row.course_charts]
    .sort((a, b) => a.order_index - b.order_index)
    .flatMap((entry): CourseChart[] =>
      entry.chart
        ? [
            {
              chartId: entry.chart.id,
              title: entry.chart.music?.title ?? "(不明)",
              difficulty: entry.chart.difficulty_type,
              level: entry.chart.level,
              chartConstant: entry.chart.chart_constant,
            },
          ]
        : [],
    );
  return {
    id: row.id,
    chapter: row.chapter,
    courseName: row.course_name,
    badgeChapter: row.badge && isBadgeChapter(row.badge.badge_chapter) ? row.badge.badge_chapter : null,
    charts,
    clearCondition: readClearCondition(row.clear_condition, charts.length),
    myResult,
  };
}

async function fetchMyResults(userId: string, courseIds?: string[]): Promise<Map<string, NonNullable<MyCourseResult>>> {
  const supabase = await createClient();
  let query = supabase
    .from("course_challenge_results")
    .select("course_id, result, achieved_at")
    .eq("user_id", userId);
  if (courseIds) query = query.in("course_id", courseIds);
  const { data, error } = await query;
  if (error) throw new Error(`failed to fetch course results: ${error.message}`);

  return new Map(
    data.flatMap((row) =>
      row.result === "cleared" || row.result === "failed"
        ? [[row.course_id, { result: row.result, achievedAt: row.achieved_at }] as const]
        : [],
    ),
  );
}

/** 全コースをチャプター順（数値→記号）、同チャプター内は名前順で取得する。 */
export async function listCourses(userId: string): Promise<CourseView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .overrideTypes<CourseRow[], { merge: false }>();
  if (error) throw new Error(`failed to fetch courses: ${error.message}`);

  const results = await fetchMyResults(userId);
  return data
    .map((row) => toCourseView(row, results.get(row.id) ?? null))
    .sort((a, b) => compareChapters(a.chapter, b.chapter) || a.courseName.localeCompare(b.courseName, "ja"));
}

/** コース詳細。存在しない場合はnull。 */
export async function getCourse(id: string, userId: string): Promise<CourseView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<CourseRow, { merge: false }>();
  if (error) throw new Error(`failed to fetch course: ${error.message}`);
  if (!data) return null;

  const results = await fetchMyResults(userId, [id]);
  return toCourseView(data, results.get(id) ?? null);
}
