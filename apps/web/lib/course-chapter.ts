/** コースのチャプター: 先頭ゼロなしの1〜2桁の数字、または数字以外の1文字（α等）。DBのcourses_chapter_checkと一致させる。 */
const CHAPTER_PATTERN = /^(?:[1-9][0-9]?|[^0-9\s])$/u;

export function isValidChapter(value: string): boolean {
  return CHAPTER_PATTERN.test(value);
}

const isNumeric = (value: string) => /^[0-9]+$/.test(value);

/** 数値チャプターを数値順、記号チャプターをその後ろに文字コード順で並べる。 */
export function compareChapters(a: string, b: string): number {
  const aNumeric = isNumeric(a);
  const bNumeric = isNumeric(b);
  if (aNumeric && bNumeric) return Number(a) - Number(b);
  if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
  return (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0);
}

/** 一覧表示用のラベル（数値は「CHAPTER n」、記号はそのまま「CHAPTER α」）。 */
export function formatChapter(value: string): string {
  return `CHAPTER ${value}`;
}
