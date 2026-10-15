export type RankingSong = { chartId: string; technicalScore: number; playDateTime?: string };

export type RankingSubmission = {
  id: string;
  userId: string;
  /** ISO 8601 */
  submittedAt: string;
  songs: RankingSong[];
};

export type ParticipantScore = {
  totalScore: number;
  /** この合計スコアに到達した日時（同点時の順位判定に使う） */
  achievedAt: string;
  /** 合計スコアに到達した提出 */
  submissionId: string;
};

export type RankingEntry = ParticipantScore & { userId: string; rank: number };

function time(value: string): number {
  return new Date(value).getTime();
}

/**
 * 1人分の提出から大会スコアを算出する。
 * 連続プレイ必須: 1回の提出の合計が最大のもの。
 * 単曲提出可: 課題曲ごとの最高スコアの合計（未提出の曲は0点）。
 */
export function computeParticipantScore(
  submissions: RankingSubmission[],
  continuousPlayRequired: boolean,
): ParticipantScore | null {
  if (submissions.length === 0) return null;

  if (continuousPlayRequired) {
    let best: ParticipantScore | null = null;
    for (const submission of submissions) {
      const totalScore = submission.songs.reduce((sum, song) => sum + song.technicalScore, 0);
      const better =
        !best ||
        totalScore > best.totalScore ||
        (totalScore === best.totalScore && time(submission.submittedAt) < time(best.achievedAt));
      if (better) best = { totalScore, achievedAt: submission.submittedAt, submissionId: submission.id };
    }
    return best;
  }

  const bestPerChart = new Map<string, { score: number; submittedAt: string; submissionId: string }>();
  for (const submission of submissions) {
    for (const song of submission.songs) {
      const current = bestPerChart.get(song.chartId);
      const better =
        !current ||
        song.technicalScore > current.score ||
        (song.technicalScore === current.score && time(submission.submittedAt) < time(current.submittedAt));
      if (better) {
        bestPerChart.set(song.chartId, {
          score: song.technicalScore,
          submittedAt: submission.submittedAt,
          submissionId: submission.id,
        });
      }
    }
  }

  let totalScore = 0;
  let latest: { submittedAt: string; submissionId: string } | null = null;
  for (const entry of bestPerChart.values()) {
    totalScore += entry.score;
    if (!latest || time(entry.submittedAt) > time(latest.submittedAt)) latest = entry;
  }
  return latest ? { totalScore, achievedAt: latest.submittedAt, submissionId: latest.submissionId } : null;
}

/** 参加者ごとのスコアを算出し、スコア降順・同点は到達日時の早い順で順位付けする。 */
export function computeRanking(submissions: RankingSubmission[], continuousPlayRequired: boolean): RankingEntry[] {
  const byUser = new Map<string, RankingSubmission[]>();
  for (const submission of submissions) {
    byUser.set(submission.userId, [...(byUser.get(submission.userId) ?? []), submission]);
  }

  const scored: Array<ParticipantScore & { userId: string }> = [];
  for (const [userId, userSubmissions] of byUser) {
    const score = computeParticipantScore(userSubmissions, continuousPlayRequired);
    if (score) scored.push({ userId, ...score });
  }
  scored.sort((a, b) => b.totalScore - a.totalScore || time(a.achievedAt) - time(b.achievedAt));

  const entries: RankingEntry[] = [];
  scored.forEach((entry, index) => {
    const previous = entries[index - 1];
    const tied =
      previous && previous.totalScore === entry.totalScore && time(previous.achievedAt) === time(entry.achievedAt);
    entries.push({ ...entry, rank: tied ? previous.rank : index + 1 });
  });
  return entries;
}
