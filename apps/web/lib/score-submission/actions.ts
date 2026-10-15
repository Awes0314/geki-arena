"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, failInternal, ok, type ActionResult } from "@/lib/actions/result";
import { fetchChartCandidates } from "@/lib/score-submission/chart-candidates";
import { matchChart } from "@/lib/score-submission/chart-matching";
import { parseBookmarkletPayload } from "@/lib/score-submission/schema";

/** プレイのidx -> レベル。譜面を特定できない場合はnull。 */
export type PlayLevels = Record<string, string | null>;

/** 受信したプレイを譜面マスタと照合し、各プレイのレベルを返す。 */
export async function resolvePlayLevels(input: unknown): Promise<ActionResult<PlayLevels>> {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "ログインが必要です。");

  const payload = parseBookmarkletPayload(input);
  if (!payload) return fail("VALIDATION_ERROR", "送信データの形式が不正です。");

  try {
    const candidates = await fetchChartCandidates([...new Set(payload.plays.map((play) => play.title))]);
    const levels: PlayLevels = {};
    for (const play of payload.plays) {
      levels[play.idx] = matchChart(play, candidates)?.level ?? null;
    }
    return ok(levels);
  } catch (cause) {
    return failInternal("resolvePlayLevels", cause);
  }
}
