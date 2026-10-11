"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, failInternal, ok, type ActionResult } from "@/lib/actions/result";
import { matchChart, type ChartCandidate } from "@/lib/score-submission/chart-matching";
import { parseBookmarkletPayload } from "@/lib/score-submission/schema";
import { createClient } from "@/lib/supabase/server";

/** プレイのidx -> レベル。譜面を特定できない場合はnull。 */
export type PlayLevels = Record<string, string | null>;

/** 受信したプレイを譜面マスタと照合し、各プレイのレベルを返す。 */
export async function resolvePlayLevels(input: unknown): Promise<ActionResult<PlayLevels>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const payload = parseBookmarkletPayload(input);
  if (!payload) return fail("VALIDATION_ERROR", "送信データの形式が不正です。");

  const titles = [...new Set(payload.plays.map((play) => play.title))];
  if (titles.length === 0) return ok({});

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charts")
    .select("id, difficulty_type, level, jacket_image_url, musics!inner(title)")
    .eq("is_active", true)
    .in("musics.title", titles);
  if (error) return failInternal("resolvePlayLevels", error);

  const candidates: ChartCandidate[] = data.flatMap((row) => {
    const music = Array.isArray(row.musics) ? row.musics[0] : row.musics;
    if (!music) return [];
    return [
      {
        chartId: row.id,
        title: music.title,
        difficulty: row.difficulty_type,
        level: row.level,
        jacketImageUrl: row.jacket_image_url,
      },
    ];
  });

  const levels: PlayLevels = {};
  for (const play of payload.plays) {
    levels[play.idx] = matchChart(play, candidates)?.level ?? null;
  }
  return ok(levels);
}
