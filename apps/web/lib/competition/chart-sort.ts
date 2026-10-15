export const CHART_SEARCH_SORTS = ["title", "constant_desc", "constant_asc"] as const;
export type ChartSearchSort = (typeof CHART_SEARCH_SORTS)[number];

export const CHART_SEARCH_SORT_LABELS: Record<ChartSearchSort, string> = {
  title: "楽曲名順",
  constant_desc: "譜面定数が高い順",
  constant_asc: "譜面定数が低い順",
};
