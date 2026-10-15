/** 譜面レベル表示値（例: "13", "13+"）を比較用の数値に変換する。"+"は+0.5とする。 */
export function levelToNumber(level: string): number | null {
  const match = /^(\d+)(\+?)$/.exec(level.trim());
  if (!match) return null;
  return Number(match[1]) + (match[2] === "+" ? 0.5 : 0);
}

/** レベル範囲フィルタの選択肢（15～0、7以上のみ"+"付きもあり、15+→15→14+→...となる）。 */
export const LEVEL_OPTIONS: string[] = Array.from({ length: 16 }, (_, i) => {
  const level = 15 - i;
  return level >= 7 ? [`${level}+`, `${level}`] : [`${level}`];
}).flat();
