import type { OneVOneStatus } from "@/lib/one-v-one/status";

type FilterableMatch = {
  status: OneVOneStatus;
  isCreator: boolean;
  creator: { displayName: string } | null;
  opponent: { displayName: string } | null;
  creatorChart: { title: string } | null;
  opponentChart: { title: string } | null;
  randomChart: { title: string } | null;
};

/** 成立前は、作成者以外には作成者選曲の楽曲名を伏せる。 */
export function isCreatorTitleHidden(match: Pick<FilterableMatch, "status" | "isCreator">): boolean {
  const started = match.status === "established" || match.status === "finished";
  return !started && !match.isCreator;
}

/** キーワード（ユーザー名・楽曲名の部分一致）で絞り込む。伏せている楽曲名は対象外。 */
export function filterMatches<T extends FilterableMatch>(items: T[], query: string): T[] {
  const keyword = query.trim().toLowerCase();
  if (keyword === "") return items;

  return items.filter((item) => {
    const haystacks = [
      item.creator?.displayName,
      item.opponent?.displayName,
      isCreatorTitleHidden(item) ? undefined : item.creatorChart?.title,
      item.opponentChart?.title,
      item.randomChart?.title,
    ];
    return haystacks.some((text) => text?.toLowerCase().includes(keyword));
  });
}
