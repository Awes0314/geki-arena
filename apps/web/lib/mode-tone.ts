/** モード（大会=赤、1v1=緑）のイメージカラー。Tailwindが検出できるよう、クラス名は完全な文字列で持つ。 */
export type ModeTone = "competition" | "one-v-one" | "course";

export const MODE_TONE_CLASS: Record<ModeTone, { text: string; headingBorder: string; cardBorder: string }> = {
  competition: {
    text: "text-mode-competition",
    headingBorder: "border-l-4 border-mode-competition pl-3",
    cardBorder: "border-t-4 border-t-mode-competition",
  },
  "one-v-one": {
    text: "text-mode-one-v-one",
    headingBorder: "border-l-4 border-mode-one-v-one pl-3",
    cardBorder: "border-t-4 border-t-mode-one-v-one",
  },
  course: {
    text: "text-mode-course",
    headingBorder: "border-l-4 border-mode-course pl-3",
    cardBorder: "border-t-4 border-t-mode-course",
  },
};
