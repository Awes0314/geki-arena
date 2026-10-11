import { NextResponse } from "next/server";

import { syncMastersFromPongeki } from "@/lib/admin/pongeki-sync";
import { getCurrentUser } from "@/lib/auth/current-user";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Pongekiから楽曲・譜面マスタを最新化する（運営者のみ）。 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return errorResponse(401, "UNAUTHENTICATED", "ログインが必要です。");
  if (user.role !== "admin") return errorResponse(403, "FORBIDDEN", "権限がありません。");

  try {
    const summary = await syncMastersFromPongeki(user.id);
    return NextResponse.json({ data: summary });
  } catch (cause) {
    console.error("[pongeki-sync]", cause instanceof Error ? cause.message : cause);
    return errorResponse(500, "INTERNAL_ERROR", "マスタの最新化に失敗しました。既存のデータは変更されていません。");
  }
}
