import type { RankingSubmission } from "@/lib/competition/ranking";
import type { SubmissionContextType } from "@/lib/score-submission/persist";
import { createAdminClient } from "@/lib/supabase/admin";

/** 指定ユーザーの有効な提出（曲ごとのスコア付き）を取得する。内訳はRLSで非公開のためService Roleで必要な列のみ読む。 */
export async function fetchValidSubmissions(params: {
  contextType: SubmissionContextType;
  contextId: string;
  userIds: string[];
}): Promise<RankingSubmission[]> {
  if (params.userIds.length === 0) return [];
  const admin = createAdminClient();

  const { data: submissions, error } = await admin
    .from("score_submissions")
    .select("id, submitter_id, submitted_at")
    .eq("context_type", params.contextType)
    .eq("context_id", params.contextId)
    .eq("validation_status", "valid")
    .in("submitter_id", params.userIds);
  if (error) throw new Error(`failed to fetch submissions: ${error.message}`);
  if (submissions.length === 0) return [];

  const { data: songs, error: songError } = await admin
    .from("song_scores")
    .select("submission_id, chart_id, technical_score, play_date_time")
    .in(
      "submission_id",
      submissions.map((row) => row.id),
    );
  if (songError) throw new Error(`failed to fetch song scores: ${songError.message}`);

  return submissions.map((submission) => ({
    id: submission.id,
    userId: submission.submitter_id,
    submittedAt: submission.submitted_at,
    songs: songs
      .filter((song) => song.submission_id === submission.id && song.chart_id !== null)
      .map((song) => ({
        chartId: song.chart_id as string,
        technicalScore: song.technical_score,
        playDateTime: song.play_date_time,
      })),
  }));
}
