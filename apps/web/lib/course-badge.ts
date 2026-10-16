/** コースチャプター（1〜9: 難易度順 / alpha・beta・gamma: 特殊条件コース）。DBの course_badges.badge_chapter と一致させる。 */
export const BADGE_CHAPTERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "alpha", "beta", "gamma"] as const;

export type BadgeChapter = (typeof BADGE_CHAPTERS)[number];

type BadgeStyle = {
  /** バッジ中央に描く1文字 */
  glyph: string;
  /** 差し色（シェブロン） */
  accent: string;
  /** 六角形の枠線色 */
  frame: string;
};

const SPECIAL_FRAME = "#e2e8f0";

/** チャプターごとの見た目。色を変えたいときはここだけ編集する。 */
export const BADGE_STYLES: Record<BadgeChapter, BadgeStyle> = {
  "1": { glyph: "1", accent: "#94a3b8", frame: "#94a3b8" },
  "2": { glyph: "2", accent: "#2dd4bf", frame: "#2dd4bf" },
  "3": { glyph: "3", accent: "#38bdf8", frame: "#38bdf8" },
  "4": { glyph: "4", accent: "#818cf8", frame: "#818cf8" },
  "5": { glyph: "5", accent: "#c084fc", frame: "#c084fc" },
  "6": { glyph: "6", accent: "#f472b6", frame: "#f472b6" },
  "7": { glyph: "7", accent: "#fb923c", frame: "#fb923c" },
  "8": { glyph: "8", accent: "#f87171", frame: "#f87171" },
  "9": { glyph: "9", accent: "#facc15", frame: "#facc15" },
  alpha: { glyph: "α", accent: "#34d399", frame: SPECIAL_FRAME },
  beta: { glyph: "β", accent: "#22d3ee", frame: SPECIAL_FRAME },
  gamma: { glyph: "γ", accent: "#e879f9", frame: SPECIAL_FRAME },
};

export function isBadgeChapter(value: string): value is BadgeChapter {
  return (BADGE_CHAPTERS as readonly string[]).includes(value);
}
