import { recordActivity } from "@/lib/logging/activity-log";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmissionContextType = "competition" | "one_v_one" | "course";

export type NewSongScore = {
  chartId: string;
  technicalScore: number;
  playDateTime: string;
  jacketImageUrl: string | null;
  /** プレイ履歴詳細から取得した値（一覧のみの提出ではundefined） */
  detail?: {
    maxCombo: number;
    criticalBreak: number;
    break: number;
    hit: number;
    miss: number;
    bell: { obtained: number; total: number };
    damage: number;
  };
};

/** 提出と曲ごとのスコアを保存する。曲の保存に失敗した場合は提出を取り消す。 */
export async function insertScoreSubmission(params: {
  id: string;
  submitterId: string;
  contextType: SubmissionContextType;
  contextId: string;
  submittedAt: string;
  songs: NewSongScore[];
  updateApplied: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  const { error: submissionError } = await admin.from("score_submissions").insert({
    id: params.id,
    submitter_id: params.submitterId,
    context_type: params.contextType,
    context_id: params.contextId,
    submitted_at: params.submittedAt,
    total_score: params.songs.reduce((sum, song) => sum + song.technicalScore, 0),
    validation_status: "valid",
    update_applied: params.updateApplied,
  });
  if (submissionError) throw new Error(`failed to insert submission: ${submissionError.message}`);

  const { error: songError } = await admin.from("song_scores").insert(
    params.songs.map((song, index) => ({
      submission_id: params.id,
      order_index: index,
      chart_id: song.chartId,
      play_date_time: song.playDateTime,
      technical_score: song.technicalScore,
      jacket_image_url: song.jacketImageUrl,
      max_combo: song.detail?.maxCombo ?? null,
      critical_break: song.detail?.criticalBreak ?? null,
      break_count: song.detail?.break ?? null,
      hit_count: song.detail?.hit ?? null,
      miss_count: song.detail?.miss ?? null,
      bell_count: song.detail ? `${song.detail.bell.obtained}/${song.detail.bell.total}` : null,
      damage_count: song.detail?.damage ?? null,
    })),
  );
  if (songError) {
    await admin.from("score_submissions").delete().eq("id", params.id);
    throw new Error(`failed to insert song scores: ${songError.message}`);
  }

  await recordActivity({
    eventType: "score_submit",
    userId: params.submitterId,
    detail: { submissionId: params.id, contextType: params.contextType, contextId: params.contextId },
  });
}
