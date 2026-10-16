import { ONGEKI_NET_ORIGIN } from "@/lib/score-submission/schema";
import { createAdminClient } from "@/lib/supabase/admin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ONGEKI_NET_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  Vary: "Origin",
};

type Row = {
  chart: { difficulty_type: string; level: string; is_active: boolean; music: { title: string } | null } | null;
};

/** コースに採用されている有効な譜面の一覧を返す（マスタデータのみ、認証不要）。 */
export async function GET() {
  const { data, error } = await createAdminClient()
    .from("course_charts")
    .select("chart:charts(difficulty_type, level, is_active, music:musics(title))")
    .overrideTypes<Row[], { merge: false }>();
  if (error) {
    console.error("failed to fetch course songs", error.message);
    return Response.json({ error: "INTERNAL" }, { status: 500, headers: CORS_HEADERS });
  }

  const unique = new Map<string, { title: string; difficulty: string; level: string }>();
  for (const { chart } of data) {
    if (!chart?.is_active || !chart.music) continue;
    unique.set(`${chart.music.title}\u0000${chart.difficulty_type}`, {
      title: chart.music.title,
      difficulty: chart.difficulty_type,
      level: chart.level,
    });
  }
  return Response.json({ songs: [...unique.values()] }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
