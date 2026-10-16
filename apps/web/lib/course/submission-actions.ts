"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, failInternal, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { selectContinuousPlays, type MatchedPlay, type Period } from "@/lib/competition/selection";
import type { BadgeChapter } from "@/lib/course-badge";
import { formatChapter } from "@/lib/course-chapter";
import { judgeCourse, requiresDetail, type JudgeResult, type JudgedSong } from "@/lib/course/judge";
import { getCourse, listCourses, type CourseView } from "@/lib/course/queries";
import { matchPlaysToCharts } from "@/lib/score-submission/chart-candidates";
import { insertScoreSubmission } from "@/lib/score-submission/persist";
import { parseBookmarkletPayload } from "@/lib/score-submission/schema";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmittableCourse = { id: string; label: string };

export type CourseSubmissionPreview = {
  /** 課題曲順のプレイidx。連続プレイの履歴が見つからない場合はnull */
  playIdx: string[] | null;
  judge: JudgeResult | null;
  alreadyCleared: boolean;
};

export type CourseSubmissionResult = {
  courseId: string;
  courseName: string;
  badgeChapter: BadgeChapter | null;
  passed: boolean;
  /** 今回の提出で初めてクリアしたか */
  newlyCleared: boolean;
  alreadyCleared: boolean;
  judge: JudgeResult;
};

const uuid = z.string().uuid();

/** コースに期間はないため、全期間を対象にする。 */
const ANY_PERIOD: Period = { startAt: new Date(0), endAt: new Date(8.64e15) };

type Evaluation = {
  course: CourseView;
  plays: MatchedPlay[];
  judge: JudgeResult;
};

type EvaluateOutcome =
  | { ok: true; evaluation: Evaluation }
  | { ok: false; reason: "no_continuous_play" | "no_detail"; message: string };

/** 受信したプレイ履歴から連続プレイを選び、コースの合否を判定する。 */
async function evaluate(course: CourseView, rawPlays: MatchedPlay[]): Promise<EvaluateOutcome> {
  const chartIds = course.charts.map((chart) => chart.chartId);
  const selected = selectContinuousPlays(rawPlays, chartIds, ANY_PERIOD);
  if (!selected) {
    return { ok: false, reason: "no_continuous_play", message: "コースの楽曲を連続して（間隔30分以内）プレイした履歴が見つかりません。" };
  }
  const plays = [...selected].sort(
    (a, b) => chartIds.indexOf(a.chartId as string) - chartIds.indexOf(b.chartId as string),
  );

  if (requiresDetail(course.clearCondition) && plays.some((entry) => !entry.play.detail)) {
    return {
      ok: false,
      reason: "no_detail",
      message: "プレイ履歴詳細を取得できていないため判定できません。ブックマークレットを「コース」で再実行してください。",
    };
  }

  const songs: JudgedSong[] = plays.map(({ play }) => ({
    technicalScore: play.technicalScore,
    detail: play.detail
      ? {
          breakCount: play.detail.break,
          hitCount: play.detail.hit,
          missCount: play.detail.miss,
          bellObtained: play.detail.bell.obtained,
          bellTotal: play.detail.bell.total,
          damage: play.detail.damage,
        }
      : null,
  }));
  return { ok: true, evaluation: { course, plays, judge: judgeCourse(course.clearCondition, songs) } };
}

/** 提出者の過去のコース提出に、同一（譜面・プレイ日時・テクニカルスコア）のプレイがすべて含まれるか。 */
async function isAllDuplicate(userId: string, courseId: string, plays: MatchedPlay[]): Promise<boolean> {
  const admin = createAdminClient();
  const { data: submissions, error } = await admin
    .from("score_submissions")
    .select("id")
    .eq("submitter_id", userId)
    .eq("context_type", "course")
    .eq("context_id", courseId);
  if (error) throw new Error(`failed to fetch submissions: ${error.message}`);
  if (submissions.length === 0) return false;

  const { data: songs, error: songError } = await admin
    .from("song_scores")
    .select("chart_id, play_date_time, technical_score")
    .in(
      "submission_id",
      submissions.map((row) => row.id),
    );
  if (songError) throw new Error(`failed to fetch song scores: ${songError.message}`);

  return plays.every((entry) =>
    songs.some(
      (song) =>
        song.chart_id === entry.chartId &&
        Number(song.technical_score) === entry.play.technicalScore &&
        new Date(song.play_date_time).getTime() === new Date(entry.play.playDateTime).getTime(),
    ),
  );
}

/** 提出先として選べるコース一覧。 */
export async function getSubmittableCourses(): Promise<ActionResult<SubmittableCourse[]>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");
  try {
    const courses = await listCourses(user.id);
    return ok(courses.map((course) => ({ id: course.id, label: `${formatChapter(course.chapter)} ${course.courseName}` })));
  } catch (cause) {
    return failInternal("getSubmittableCourses", cause);
  }
}

type PrepareInput = { payload: unknown; courseId: string };

/** 受信したプレイ履歴をコースに照らし、提出内容と合否を事前に算出する。 */
export async function prepareCourseSubmission(input: PrepareInput): Promise<ActionResult<CourseSubmissionPreview>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const payload = parseBookmarkletPayload(input.payload);
  if (!payload || payload.mode !== "course" || !uuid.safeParse(input.courseId).success) {
    return fail("VALIDATION_ERROR", "送信データの形式が不正です。");
  }

  try {
    const course = await getCourse(input.courseId, user.id);
    if (!course) return fail("NOT_FOUND", "コースが見つかりません。");

    const outcome = await evaluate(course, await matchPlaysToCharts(payload.plays));
    const alreadyCleared = course.myResult?.result === "cleared";
    if (!outcome.ok) {
      return outcome.reason === "no_detail"
        ? fail("VALIDATION_ERROR", outcome.message)
        : ok({ playIdx: null, judge: null, alreadyCleared });
    }
    return ok({
      playIdx: outcome.evaluation.plays.map((entry) => entry.play.idx),
      judge: outcome.evaluation.judge,
      alreadyCleared,
    });
  } catch (cause) {
    return failInternal("prepareCourseSubmission", cause);
  }
}

const submitSchema = z.object({ payload: z.unknown(), courseId: z.string() });

/** コースへ提出し、合否判定・挑戦結果の保存を行う。 */
export async function submitCourseScores(
  input: z.input<typeof submitSchema>,
): Promise<ActionResult<CourseSubmissionResult>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const parsedInput = submitSchema.safeParse(input);
  const payload = parsedInput.success ? parseBookmarkletPayload(parsedInput.data.payload) : null;
  if (!parsedInput.success || !payload || payload.mode !== "course" || !uuid.safeParse(parsedInput.data.courseId).success) {
    return fail("VALIDATION_ERROR", "送信データの形式が不正です。");
  }
  const { courseId } = parsedInput.data;

  try {
    const course = await getCourse(courseId, user.id);
    if (!course) return fail("NOT_FOUND", "コースが見つかりません。");

    const outcome = await evaluate(course, await matchPlaysToCharts(payload.plays));
    if (!outcome.ok) return fail("VALIDATION_ERROR", outcome.message);
    const { plays, judge } = outcome.evaluation;

    if (await isAllDuplicate(user.id, courseId, plays)) {
      return fail("CONFLICT", "選択したプレイはすでに提出済みです。");
    }

    const alreadyCleared = course.myResult?.result === "cleared";
    // クリア済みの結果は維持し、最新提出で上書きしない
    const updateApplied = !alreadyCleared;
    const submissionId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await insertScoreSubmission({
      id: submissionId,
      submitterId: user.id,
      contextType: "course",
      contextId: courseId,
      submittedAt: nowIso,
      updateApplied,
      songs: plays.map(({ play, chartId }) => ({
        chartId: chartId as string,
        technicalScore: play.technicalScore,
        playDateTime: play.playDateTime,
        jacketImageUrl: play.jacketImageUrl,
        detail: play.detail,
      })),
    });

    if (updateApplied) {
      const admin = createAdminClient();
      const row = {
        course_id: courseId,
        user_id: user.id,
        latest_submission_id: submissionId,
        result: judge.passed ? "cleared" : "failed",
        achieved_at: judge.passed ? nowIso : null,
      };
      const { error } = course.myResult
        ? await admin
            .from("course_challenge_results")
            .update(row)
            .eq("course_id", courseId)
            .eq("user_id", user.id)
            .neq("result", "cleared")
        : await admin.from("course_challenge_results").insert(row);
      if (error) throw new Error(`failed to save course result: ${error.message}`);
    }

    revalidatePath("/courses");
    revalidatePath(`/courses/${courseId}`);
    return ok({
      courseId,
      courseName: course.courseName,
      badgeChapter: course.badgeChapter,
      passed: judge.passed,
      newlyCleared: judge.passed && !alreadyCleared,
      alreadyCleared,
      judge,
    });
  } catch (cause) {
    return failInternal("submitCourseScores", cause);
  }
}
