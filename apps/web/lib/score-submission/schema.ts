import { z } from "zod";

import { DIFFICULTY_TYPES } from "@/lib/admin/pongeki-mapping";

/** ブックマークレットの送信データのスキーマバージョン。 */
export const BOOKMARKLET_SCHEMA_VERSION = "bookmarklet.v1";

/** ブックマークレットの送信元として許可するオリジン。 */
export const ONGEKI_NET_ORIGIN = "https://ongeki-net.com";

export const SUBMISSION_MODES = ["tournament", "course"] as const;
export type SubmissionMode = (typeof SUBMISSION_MODES)[number];

const count = z.number().int().min(0);

const playDetailSchema = z.object({
  maxCombo: count,
  criticalBreak: count,
  break: count,
  hit: count,
  miss: count,
  bell: z.object({ obtained: count, total: count }),
  damage: count,
});

const playSchema = z.object({
  idx: z.string().min(1),
  title: z.string().trim().min(1),
  difficulty: z.enum(DIFFICULTY_TYPES),
  /** JST(+09:00)のISO 8601。 */
  playDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/),
  technicalScore: z.number().int().min(0).max(1_010_000),
  jacketImageUrl: z.string().min(1),
  detail: playDetailSchema.optional(),
});

export const bookmarkletPayloadSchema = z.object({
  schema: z.literal(BOOKMARKLET_SCHEMA_VERSION),
  mode: z.enum(SUBMISSION_MODES),
  plays: z.array(playSchema).max(50),
});

export type BookmarkletPayload = z.infer<typeof bookmarkletPayloadSchema>;
export type BookmarkletPlay = BookmarkletPayload["plays"][number];

/** 受信データを検証する。不正な場合はnullを返す。 */
export function parseBookmarkletPayload(data: unknown): BookmarkletPayload | null {
  const result = bookmarkletPayloadSchema.safeParse(data);
  return result.success ? result.data : null;
}
