"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectInput } from "@/components/ui/Fields";
import { CourseBadge } from "@/components/user/CourseBadge";
import { METRIC_DEFS } from "@/lib/course-condition";
import type { JudgeResult } from "@/lib/course/judge";
import {
  getSubmittableCourses,
  prepareCourseSubmission,
  submitCourseScores,
  type CourseSubmissionPreview,
  type CourseSubmissionResult,
  type SubmittableCourse,
} from "@/lib/course/submission-actions";
import type { BookmarkletPayload } from "@/lib/score-submission/schema";

function JudgeSummary({ judge }: { judge: JudgeResult }) {
  const checks = [...judge.perChart.flat(), ...judge.total];
  if (checks.length === 0) return <p className="text-sm">設定されたクリア条件はありません。</p>;
  const failed = checks.filter((check) => !check.passed);
  return (
    <p className="text-sm">
      判定: {judge.passed ? "合格" : "不合格"}
      {failed.length > 0 && `（未達: ${[...new Set(failed.map((check) => METRIC_DEFS[check.key].label))].join("、")}）`}
    </p>
  );
}

/** 合格時のエンブレム獲得演出。 */
function ClearCelebration({ result }: { result: CourseSubmissionResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 14 }}
      className="flex flex-col items-center gap-3 py-4"
    >
      <p className="text-lg font-bold">コースクリア!</p>
      {result.badgeChapter && (
        <motion.div initial={{ rotate: -180 }} animate={{ rotate: 0 }} transition={{ duration: 0.8 }}>
          <CourseBadge badgeChapter={result.badgeChapter} courseName={result.courseName} size={112} />
        </motion.div>
      )}
      <p className="text-sm">{result.courseName} のエンブレムを獲得しました。</p>
    </motion.div>
  );
}

/** 受信したプレイ履歴を、選択したコースへ提出するパネル。 */
export function CourseSubmitPanel({ payload }: { payload: BookmarkletPayload }) {
  const [courses, setCourses] = useState<SubmittableCourse[] | null>(null);
  const [courseId, setCourseId] = useState("");
  const [preview, setPreview] = useState<CourseSubmissionPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CourseSubmissionResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getSubmittableCourses().then((response) => {
      if (cancelled) return;
      if (response.ok) setCourses(response.data);
      else {
        setCourses([]);
        setMessage(response.error.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectCourse(id: string) {
    setCourseId(id);
    setPreview(null);
    setMessage(null);
    if (id === "") return;
    startTransition(async () => {
      const response = await prepareCourseSubmission({ payload, courseId: id });
      if (response.ok) setPreview(response.data);
      else setMessage(response.error.message);
    });
  }

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const response = await submitCourseScores({ payload, courseId });
      if (response.ok) setResult(response.data);
      else setMessage(response.error.message);
    });
  }

  if (result) {
    return (
      <Card className="flex flex-col gap-3">
        {result.newlyCleared ? (
          <ClearCelebration result={result} />
        ) : (
          <Alert variant={result.passed ? "success" : "info"}>
            {result.passed
              ? "合格条件を満たしました（すでにクリア済みです）。"
              : "合格条件を満たしませんでした。"}
            {result.alreadyCleared && !result.passed && " クリア済みの結果は維持されます。"}
          </Alert>
        )}
        <JudgeSummary judge={result.judge} />
        <Link href={`/courses/${result.courseId}`} className={buttonStyles("primary")}>
          コース詳細へ
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      {courses === null ? (
        <p className="text-sm text-muted">コースを読み込み中...</p>
      ) : (
        <SelectInput label="提出するコース" value={courseId} onChange={(event) => selectCourse(event.target.value)}>
          <option value="">選択してください</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.label}
            </option>
          ))}
        </SelectInput>
      )}
      {message && <Alert variant="error">{message}</Alert>}
      {preview && preview.playIdx === null && (
        <Alert variant="error">コースの楽曲を連続して（間隔30分以内）プレイした履歴が見つかりません。</Alert>
      )}
      {preview?.judge && <JudgeSummary judge={preview.judge} />}
      {preview?.alreadyCleared && (
        <Alert variant="info">このコースはクリア済みです。再提出してもクリア済みの結果は維持されます。</Alert>
      )}
      <Button variant="primary" disabled={pending || !preview?.playIdx} onClick={submit}>
        提出する
      </Button>
    </Card>
  );
}
