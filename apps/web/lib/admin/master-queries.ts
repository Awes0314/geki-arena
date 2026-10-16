import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

export const MASTER_PAGE_SIZE = 20;

export type MasterSummary = {
  musicCount: number;
  activeChartCount: number;
  inactiveChartCount: number;
  ratingClassCount: number;
  lastUpdatedAt: string | null;
};

export type MasterMusic = Pick<Tables<"musics">, "id" | "title" | "updated_at"> & {
  charts: Pick<Tables<"charts">, "id" | "difficulty_type" | "level" | "chart_constant" | "is_active">[];
};

const head = { count: "exact", head: true } as const;

/** ilike/orのメタ文字を無害化する。 */
function sanitizeKeyword(keyword: string): string {
  return keyword.replace(/[%_\\,()]/g, " ").trim();
}

export async function getMasterSummary(): Promise<MasterSummary> {
  const admin = createAdminClient();
  const [musics, active, inactive, ratings, latest] = await Promise.all([
    admin.from("musics").select("id", head),
    admin.from("charts").select("id", head).eq("is_active", true),
    admin.from("charts").select("id", head).eq("is_active", false),
    admin.from("rating_classes").select("id", head),
    admin.from("musics").select("updated_at").order("updated_at", { ascending: false }).limit(1),
  ]);
  const error = [musics, active, inactive, ratings, latest].find((result) => result.error)?.error;
  if (error) throw new Error(`failed to fetch master summary: ${error.message}`);

  return {
    musicCount: musics.count ?? 0,
    activeChartCount: active.count ?? 0,
    inactiveChartCount: inactive.count ?? 0,
    ratingClassCount: ratings.count ?? 0,
    lastUpdatedAt: latest.data?.[0]?.updated_at ?? null,
  };
}

/** 楽曲名の部分一致で楽曲と譜面を取得する（ページ番号は1始まり）。 */
export async function listMasterMusics(
  keyword: string,
  page: number,
): Promise<{ items: MasterMusic[]; total: number }> {
  const from = (page - 1) * MASTER_PAGE_SIZE;
  let query = createAdminClient()
    .from("musics")
    .select("id, title, updated_at, charts(id, difficulty_type, level, chart_constant, is_active)", {
      count: "exact",
    })
    .order("title")
    .range(from, from + MASTER_PAGE_SIZE - 1);

  const safe = sanitizeKeyword(keyword);
  if (safe) query = query.ilike("title", `%${safe}%`);

  const { data, count, error } = await query;
  if (error) throw new Error(`failed to fetch musics: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}
