import { z } from "zod";

export const SNS_TYPES = ["x", "discord", "other"] as const;
export type SnsType = (typeof SNS_TYPES)[number];

export const SNS_LABELS: Record<SnsType, string> = {
  x: "X",
  discord: "Discord",
  other: "その他",
};

export const SNS_LINK_MAX_LENGTH = 200;

/** x: ユーザー名（@なし）、discord: ユーザー名（小文字、URL化不可）、other: httpsのURL */
export type SnsLink = { type: SnsType; value: string };

export const DISPLAY_NAME_MAX_LENGTH = 20;
export const BIO_MAX_LENGTH = 500;

export const X_USERNAME_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
// 連続するピリオドは不可
export const DISCORD_USERNAME_PATTERN = /^(?!.*\.\.)[a-z0-9_.]{2,32}$/;

/** 空文字は「未設定」として許容する。 */
function optionalField(pattern: RegExp, message: string, prefix?: RegExp) {
  return z
    .string()
    .trim()
    .transform((value) => (prefix ? value.replace(prefix, "") : value))
    .refine((value) => value === "" || pattern.test(value), message);
}

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(SNS_LINK_MAX_LENGTH, `${SNS_LINK_MAX_LENGTH}文字以内で入力してください`)
  .refine((value) => {
    if (value === "") return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "https:// から始まるURLを入力してください");
export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "表示名を入力してください")
    .max(DISPLAY_NAME_MAX_LENGTH, `表示名は${DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください`),
  bio: z.string().trim().max(BIO_MAX_LENGTH, `自己紹介は${BIO_MAX_LENGTH}文字以内で入力してください`),
  snsX: optionalField(X_USERNAME_PATTERN, "Xのユーザー名（@...）を入力してください", /^@/),
  snsDiscord: optionalField(
    new RegExp(DISCORD_USERNAME_PATTERN.source, "i"),
    "Discordのユーザー名（半角英数字・_・.の2〜32文字）を入力してください",
    /^@/,
  ).transform((value) => value.toLowerCase()),
  snsOther: optionalHttpsUrl,
  /** 空文字は未選択 */
  ratingClassId: z.string().regex(/^\d*$/, "不正な値です"),
  /** 空文字は非表示 */
  displayedBadgeId: z.string().uuid("不正な値です").or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** フォーム入力のSNS項目をDB保存形式（未入力は除外）に変換する。 */
export function toSnsLinks(input: Pick<ProfileInput, "snsX" | "snsDiscord" | "snsOther">): SnsLink[] {
  const entries: SnsLink[] = [
    { type: "x", value: input.snsX },
    { type: "discord", value: input.snsDiscord },
    { type: "other", value: input.snsOther },
  ];
  return entries.filter((link) => link.value !== "");
}

/** SNSプロフィールへのリンク先。リンクできない値（Discord含む）はnull。 */
export function snsHref(link: SnsLink): string | null {
  switch (link.type) {
    case "x":
      return X_USERNAME_PATTERN.test(link.value) ? `https://x.com/${link.value}` : null;
    case "discord":
      // ユーザー名からプロフィールURLを作れない
      return null;
    case "other":
      try {
        return new URL(link.value).protocol === "https:" ? link.value : null;
      } catch {
        return null;
      }
  }
}

/** 表示してよい値かを判定する（不正な値は表示しない）。 */
export function isValidSnsLink(link: SnsLink): boolean {
  return link.type === "discord" ? DISCORD_USERNAME_PATTERN.test(link.value) : snsHref(link) !== null;
}

/** DBのjsonb値から安全にSnsLink配列を取り出す（不正な要素は除外）。 */
export function parseSnsLinks(value: unknown): SnsLink[] {
  if (!Array.isArray(value)) return [];
  const links: SnsLink[] = [];
  for (const item of value) {
    if (
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      "value" in item &&
      typeof item.value === "string" &&
      (SNS_TYPES as readonly unknown[]).includes(item.type)
    ) {
      links.push({ type: item.type as SnsType, value: item.value });
    }
  }
  return links;
}
