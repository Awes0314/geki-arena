import { z } from "zod";

export const DIFFICULTY_TYPES = ["BASIC", "ADVANCED", "EXPERT", "MASTER", "LUNATIC"] as const;

/** Pongeki `public.CHARTS` の取得対象カラム。 */
export const PONGEKI_CHART_COLUMNS = "id, title, diff, level, chart_const, jacket_image_url, delete_flag";

const pongekiChartSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  diff: z.enum(DIFFICULTY_TYPES),
  level: z.string().min(1),
  chart_const: z.coerce.number().finite(),
  jacket_image_url: z.string().nullable(),
  delete_flag: z.boolean(),
});

export type PongekiChart = z.infer<typeof pongekiChartSchema>;

export type MasterChart = {
  pongekiChartId: string;
  musicId: string;
  title: string;
  difficultyType: string;
  level: string;
  chartConstant: number;
  jacketImageUrl: string | null;
  isActive: boolean;
};

export type ExistingChart = {
  pongeki_chart_id: string;
  music_id: string;
  difficulty_type: string;
  level: string;
  chart_constant: number;
  jacket_image_url: string | null;
  is_active: boolean;
};

export type SyncPlan = {
  musics: { id: string; title: string }[];
  charts: MasterChart[];
  deactivateChartIds: string[];
  summary: SyncSummary;
};

export type SyncSummary = {
  added: number;
  updated: number;
  deactivated: number;
};

/** Pongeki譜面ID末尾の`_<難易度>_<level>`を除いた部分を楽曲IDとする。 */
export function toMusicId(pongekiChartId: string): string {
  const match = /^(.+)_[^_]+_[^_]+$/.exec(pongekiChartId);
  if (!match) throw new Error("Unexpected Pongeki chart id format");
  return match[1];
}

/** Pongekiの生レコードを検証し、当システムの譜面表現へ変換する。不正な行がある場合は例外を投げる。 */
export function parsePongekiChart(row: unknown): MasterChart & { deleted: boolean } {
  const chart = pongekiChartSchema.parse(row);
  return {
    pongekiChartId: chart.id,
    musicId: toMusicId(chart.id),
    title: chart.title,
    difficultyType: chart.diff,
    level: chart.level,
    chartConstant: chart.chart_const,
    jacketImageUrl: chart.jacket_image_url,
    isActive: !chart.delete_flag,
    deleted: chart.delete_flag,
  };
}

function isUnchanged(existing: ExistingChart, next: MasterChart): boolean {
  return (
    existing.music_id === next.musicId &&
    existing.difficulty_type === next.difficultyType &&
    existing.level === next.level &&
    Number(existing.chart_constant) === next.chartConstant &&
    existing.jacket_image_url === next.jacketImageUrl &&
    existing.is_active === next.isActive
  );
}

/**
 * Pongekiの譜面と既存データを突き合わせ、書き込み対象と件数を算出する。
 * 当システムに未登録で削除済みの譜面は取り込まない。Pongekiに存在しない譜面は無効化する。
 */
export function planSync(
  pongekiCharts: (MasterChart & { deleted: boolean })[],
  existingCharts: ExistingChart[],
  existingMusicTitles: Map<string, string>,
): SyncPlan {
  const existingByPongekiId = new Map(existingCharts.map((chart) => [chart.pongeki_chart_id, chart]));
  const seenPongekiIds = new Set<string>();
  const charts: MasterChart[] = [];
  const musics = new Map<string, string>();
  let added = 0;
  let updated = 0;
  let deactivated = 0;

  for (const chart of pongekiCharts) {
    seenPongekiIds.add(chart.pongekiChartId);
    const existing = existingByPongekiId.get(chart.pongekiChartId);

    if (!existing && chart.deleted) continue;
    if (existingMusicTitles.get(chart.musicId) !== chart.title) musics.set(chart.musicId, chart.title);

    if (!existing) {
      added += 1;
    } else if (isUnchanged(existing, chart)) {
      continue;
    } else if (existing.is_active && !chart.isActive) {
      deactivated += 1;
    } else {
      updated += 1;
    }

    charts.push(chart);
  }

  const deactivateChartIds = existingCharts
    .filter((chart) => chart.is_active && !seenPongekiIds.has(chart.pongeki_chart_id))
    .map((chart) => chart.pongeki_chart_id);
  deactivated += deactivateChartIds.length;

  return {
    musics: [...musics].map(([id, title]) => ({ id, title })),
    charts,
    deactivateChartIds,
    summary: { added, updated, deactivated },
  };
}
