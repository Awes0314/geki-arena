import { createHash, randomInt } from "node:crypto";

// 0/O、1/I/L など混同しやすい文字を除外
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUP_LENGTH = 4;
const GROUP_COUNT = 1;

/** 例: ABCD（GROUP_COUNTを増やすとハイフン区切りで連結）。暗号論的乱数で生成する。 */
export function generateRecoveryCode(): string {
  const groups = Array.from({ length: GROUP_COUNT }, () =>
    Array.from({ length: GROUP_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""),
  );
  return groups.join("-");
}

/** 入力ゆれ（小文字・ハイフン・空白）を吸収する。 */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}
