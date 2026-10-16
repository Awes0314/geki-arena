import type { RankingSubmission } from "@/lib/competition/ranking";
import type { MatchedPlay } from "@/lib/competition/selection";

/** 提出者・譜面・プレイ日時・テクニカルスコアが既存の提出と同一のプレイは重複とみなす（score.md）。 */
export function isDuplicatePlay(existing: RankingSubmission[], entry: MatchedPlay): boolean {
  return existing.some((submission) =>
    submission.songs.some(
      (song) =>
        song.chartId === entry.chartId &&
        song.technicalScore === entry.play.technicalScore &&
        song.playDateTime !== undefined &&
        new Date(song.playDateTime).getTime() === new Date(entry.play.playDateTime).getTime(),
    ),
  );
}
