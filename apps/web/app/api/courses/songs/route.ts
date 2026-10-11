import { ONGEKI_NET_ORIGIN } from "@/lib/score-submission/schema";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ONGEKI_NET_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  Vary: "Origin",
};

/** コースに採用されている全楽曲を返す。コース機能の実装までは空配列を返す。 */
export async function GET() {
  return Response.json({ songs: [] }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
