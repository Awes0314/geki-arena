"use server";

import { z } from "zod";

import { fail, failInternal, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DIFFICULTY_TYPES } from "@/lib/admin/pongeki-mapping";
import { CHART_SEARCH_SORTS } from "@/lib/competition/chart-sort";
import { createClient } from "@/lib/supabase/server";

export type ChartSearchResult = {
  chartId: string;
  title: string;
  difficulty: string;
  level: string;
  chartConstant: number;
  jacketImageUrl: string | null;
};

const searchSchema = z.object({
  query: z.string().trim().max(100),
  difficulty: z.enum(DIFFICULTY_TYPES).or(z.literal("")),
  constantMin: z.number().min(0).max(20).nullable(),
  constantMax: z.number().min(0).max(20).nullable(),
  sort: z.enum(CHART_SEARCH_SORTS),
});

export type ChartSearchParams = z.input<typeof searchSchema>;

const FETCH_LIMIT = 300;
const RESULT_LIMIT = 20;

/** ilikeのワイルドカード文字をエスケープする。 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** 課題曲選択用に譜面を検索する（楽曲名・難易度・譜面定数で絞り込み、並び替え）。 */
export async function searchCharts(input: ChartSearchParams): Promise<ActionResult<ChartSearchResult[]>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "検索条件が不正です。");
  const { query, difficulty, constantMin, constantMax, sort } = parsed.data;

  try {
    const supabase = await createClient();
    let builder = supabase
      .from("charts")
      .select("id, difficulty_type, level, chart_constant, jacket_image_url, musics!inner(title)")
      .eq("is_active", true);
    if (query !== "") builder = builder.ilike("musics.title", `%${escapeLike(query)}%`);
    if (difficulty !== "") builder = builder.eq("difficulty_type", difficulty);
    if (constantMin !== null) builder = builder.gte("chart_constant", constantMin);
    if (constantMax !== null) builder = builder.lte("chart_constant", constantMax);

    const { data, error } = await builder
      .order("chart_constant", { ascending: sort === "constant_asc" })
      .limit(FETCH_LIMIT);
    if (error) throw new Error(error.message);

    const results = data.flatMap((row): ChartSearchResult[] => {
      const music = Array.isArray(row.musics) ? row.musics[0] : row.musics;
      if (!music) return [];
      return [
        {
          chartId: row.id,
          title: music.title,
          difficulty: row.difficulty_type,
          level: row.level,
          chartConstant: row.chart_constant,
          jacketImageUrl: row.jacket_image_url,
        },
      ];
    });
    if (sort === "title") results.sort((a, b) => a.title.localeCompare(b.title, "ja"));
    return ok(results.slice(0, RESULT_LIMIT));
  } catch (cause) {
    return failInternal("searchCharts", cause);
  }
}
