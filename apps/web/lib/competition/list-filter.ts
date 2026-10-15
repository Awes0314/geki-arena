import { levelToNumber } from "@/lib/competition/level";
import { checkParticipationCondition } from "@/lib/competition/participation";
import type { CompetitionStatus } from "@/lib/competition/period";

export type ListCriteria = {
  /** 主催者名・大会名・楽曲名のいずれかに部分一致（空は無条件） */
  query: string;
  /** レベル範囲（課題曲がすべて範囲内の大会のみ）。未指定はnull */
  levelMin: number | null;
  levelMax: number | null;
  /** trueかつ自身のRating区分があるとき、参加可能な（終了前の）大会のみ */
  eligibleOnly: boolean;
  viewerRatingOrder: number | null;
};

export type FilterableCompetition = {
  name: string;
  status: CompetitionStatus;
  organizer: { displayName: string } | null;
  ratingMin: { sortOrder: number } | null;
  ratingMax: { sortOrder: number } | null;
  targetCharts: Array<{ title: string; level: string }>;
};

/** 一覧の検索・詳細フィルタを適用する。 */
export function filterCompetitions<T extends FilterableCompetition>(items: T[], criteria: ListCriteria): T[] {
  const query = criteria.query.trim().toLowerCase();

  return items.filter((item) => {
    if (query !== "") {
      const haystacks = [item.name, item.organizer?.displayName ?? "", ...item.targetCharts.map((chart) => chart.title)];
      if (!haystacks.some((text) => text.toLowerCase().includes(query))) return false;
    }

    if (criteria.levelMin !== null || criteria.levelMax !== null) {
      const withinRange = item.targetCharts.every((chart) => {
        const level = levelToNumber(chart.level);
        if (level === null) return false;
        return (
          (criteria.levelMin === null || level >= criteria.levelMin) &&
          (criteria.levelMax === null || level <= criteria.levelMax)
        );
      });
      if (!withinRange) return false;
    }

    if (criteria.eligibleOnly && criteria.viewerRatingOrder !== null) {
      if (item.status === "finished") return false;
      const check = checkParticipationCondition(criteria.viewerRatingOrder, {
        min: item.ratingMin?.sortOrder ?? null,
        max: item.ratingMax?.sortOrder ?? null,
      });
      if (!check.ok) return false;
    }

    return true;
  });
}
