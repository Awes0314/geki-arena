import "server-only";

import { createClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import {
  PONGEKI_CHART_COLUMNS,
  parsePongekiChart,
  planSync,
  type ExistingChart,
  type SyncSummary,
} from "./pongeki-mapping";

const PAGE_SIZE = 1000;
const WRITE_CHUNK_SIZE = 500;

type Page<T> = { data: T[] | null; error: { message: string } | null };

/** PostgRESTの取得上限(1000件)を超えるテーブルを全件取得する。 */
async function fetchAll<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function createPongekiClient() {
  const url = process.env.PONGEKI_SUPABASE_URL;
  const anonKey = process.env.PONGEKI_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("PONGEKI_SUPABASE_URL / PONGEKI_SUPABASE_ANON_KEY is not set");
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Pongekiの`CHARTS`から楽曲・譜面マスタを取り込む。失敗時は例外を投げる（取得に失敗した場合、既存データは変更されない）。
 * 呼び出し元で`role=admin`の確認を済ませること。
 */
export async function syncMastersFromPongeki(operatorId: string): Promise<SyncSummary> {
  const pongeki = createPongekiClient();
  const admin = createAdminClient();

  const rawCharts = await fetchAll((from, to) =>
    pongeki.from("CHARTS").select(PONGEKI_CHART_COLUMNS).order("id").range(from, to),
  );
  const pongekiCharts = rawCharts.map(parsePongekiChart);

  const existingCharts = await fetchAll<ExistingChart>((from, to) =>
    admin
      .from("charts")
      .select("pongeki_chart_id, music_id, difficulty_type, level, chart_constant, jacket_image_url, is_active")
      .order("pongeki_chart_id")
      .range(from, to),
  );
  const existingMusics = await fetchAll((from, to) =>
    admin.from("musics").select("id, title").order("id").range(from, to),
  );

  const plan = planSync(pongekiCharts, existingCharts, new Map(existingMusics.map((m) => [m.id, m.title])));
  const now = new Date().toISOString();

  for (const rows of chunk(plan.musics, WRITE_CHUNK_SIZE)) {
    const { error } = await admin
      .from("musics")
      .upsert(rows.map((music) => ({ ...music, updated_at: now })), { onConflict: "id" });
    if (error) throw new Error(`musics upsert failed: ${error.message}`);
  }

  for (const rows of chunk(plan.charts, WRITE_CHUNK_SIZE)) {
    const { error } = await admin.from("charts").upsert(
      rows.map((chart) => ({
        pongeki_chart_id: chart.pongekiChartId,
        music_id: chart.musicId,
        difficulty_type: chart.difficultyType,
        level: chart.level,
        chart_constant: chart.chartConstant,
        jacket_image_url: chart.jacketImageUrl,
        is_active: chart.isActive,
      })),
      { onConflict: "pongeki_chart_id" },
    );
    if (error) throw new Error(`charts upsert failed: ${error.message}`);
  }

  for (const ids of chunk(plan.deactivateChartIds, WRITE_CHUNK_SIZE)) {
    const { error } = await admin.from("charts").update({ is_active: false }).in("pongeki_chart_id", ids);
    if (error) throw new Error(`charts deactivate failed: ${error.message}`);
  }

  // 同期自体は完了しているため、ログ記録の失敗は同期結果を失敗にしない
  const { error: logError } = await admin.from("operation_logs").insert({
    operator_id: operatorId,
    action_type: "master_sync",
    target_type: "pongeki_master",
    target_id: operatorId,
    detail: plan.summary as unknown as Json,
  });
  if (logError) console.error("[pongeki-sync] operation log failed:", logError.message);

  return plan.summary;
}
