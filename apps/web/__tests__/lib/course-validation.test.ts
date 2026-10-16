import { compareChapters, formatChapter, isValidChapter } from "@/lib/course-chapter";
import { emptyMetrics, readClearCondition } from "@/lib/course-condition";
import { parseCourseForm } from "@/lib/validation/course";

const CHART_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CHART_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const baseValues = {
  courseName: "テストコース",
  chapter: "1",
  badgeChapter: "alpha",
  chartIds: `${CHART_A},${CHART_B}`,
};

describe("isValidChapter", () => {
  it.each(["1", "9", "10", "99", "α", "β", "A"])("%s は有効", (value) => {
    expect(isValidChapter(value)).toBe(true);
  });

  it.each(["", "0", "01", "100", "αβ", " ", "1 ", "a1"])("%j は無効", (value) => {
    expect(isValidChapter(value)).toBe(false);
  });
});

describe("compareChapters", () => {
  it("数値は数値順、記号は数値の後ろに文字コード順で並ぶ", () => {
    const sorted = ["β", "10", "2", "α", "1"].sort(compareChapters);
    expect(sorted).toEqual(["1", "2", "10", "α", "β"]);
  });
});

describe("formatChapter", () => {
  it("CHAPTER接頭辞を付ける", () => {
    expect(formatChapter("α")).toBe("CHAPTER α");
  });
});

describe("parseCourseForm", () => {
  it("正しい入力を解析し、曲個別と通しのクリア条件を構築する", () => {
    const result = parseCourseForm(
      { ...baseValues, total_minScore: "2000000", total_maxMiss: "10", total_maxBellMissed: "0" },
      {
        minScore: ["990000", ""],
        maxBreakOrBelow: ["", "30"],
        maxHitOrBelow: ["5", ""],
        maxMiss: ["0", ""],
        maxDamage: ["", "20"],
      },
    );
    expect(result).toEqual({
      ok: true,
      data: {
        courseName: "テストコース",
        chapter: "1",
        badgeChapter: "alpha",
        chartIds: [CHART_A, CHART_B],
        clearCondition: {
          perChart: [
            { ...emptyMetrics(), minScore: 990000, maxHitOrBelow: 5, maxMiss: 0 },
            { ...emptyMetrics(), maxBreakOrBelow: 30, maxDamage: 20 },
          ],
          total: { ...emptyMetrics(), minScore: 2000000, maxMiss: 10, maxBellMissed: 0 },
        },
      },
    });
  });

  it("コース名が空・長すぎる場合はエラー", () => {
    expect(parseCourseForm({ ...baseValues, courseName: " " }, {}).ok).toBe(false);
    const long = parseCourseForm({ ...baseValues, courseName: "あ".repeat(51) }, {});
    expect(long).toMatchObject({ ok: false, fieldErrors: { courseName: expect.any(String) } });
  });

  it("チャプターが不正な場合はエラー", () => {
    expect(parseCourseForm({ ...baseValues, chapter: "100" }, {})).toMatchObject({
      ok: false,
      fieldErrors: { chapter: expect.any(String) },
    });
  });

  it("バッジのチャプターが不正な場合はエラー", () => {
    expect(parseCourseForm({ ...baseValues, badgeChapter: "delta" }, {})).toMatchObject({
      ok: false,
      fieldErrors: { badgeChapter: expect.any(String) },
    });
  });

  it("譜面が0曲・11曲・重複・不正IDの場合はエラー", () => {
    const ids = Array.from({ length: 11 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
    for (const chartIds of ["", ids.join(","), `${CHART_A},${CHART_A}`, "not-uuid"]) {
      expect(parseCourseForm({ ...baseValues, chartIds }, {})).toMatchObject({
        ok: false,
        fieldErrors: { chartIds: expect.any(String) },
      });
    }
  });

  it("曲個別の条件が範囲外・非整数の場合はエラー", () => {
    for (const input of ["1010001", "-1", "1.5", "abc"]) {
      expect(parseCourseForm(baseValues, { minScore: [input, ""] })).toMatchObject({
        ok: false,
        fieldErrors: { perChart: expect.stringContaining("1曲目") },
      });
    }
    expect(parseCourseForm(baseValues, { maxMiss: ["", "100000"] })).toMatchObject({
      ok: false,
      fieldErrors: { perChart: expect.stringContaining("2曲目") },
    });
  });

  it("通しの条件が範囲外の場合はエラー", () => {
    expect(parseCourseForm({ ...baseValues, total_maxDamage: "-5" }, {})).toMatchObject({
      ok: false,
      fieldErrors: { total: expect.any(String) },
    });
    expect(parseCourseForm({ ...baseValues, total_minScore: "10100001" }, {})).toMatchObject({
      ok: false,
      fieldErrors: { total: expect.any(String) },
    });
  });

  it("入力が不足していれば未設定(null)で補う", () => {
    const result = parseCourseForm(baseValues, {});
    expect(result).toMatchObject({
      ok: true,
      data: { clearCondition: { perChart: [emptyMetrics(), emptyMetrics()], total: emptyMetrics() } },
    });
  });
});

describe("readClearCondition", () => {
  it("保存済みの値を譜面数に合わせて読み取る", () => {
    const stored = { perChart: [{ minScore: 100, maxMiss: 3 }], total: { maxDamage: 50 } };
    expect(readClearCondition(stored, 2)).toEqual({
      perChart: [{ ...emptyMetrics(), minScore: 100, maxMiss: 3 }, emptyMetrics()],
      total: { ...emptyMetrics(), maxDamage: 50 },
    });
  });

  it("旧形式(minScores/minTotalScore)も読み取れる", () => {
    expect(readClearCondition({ minScores: [100, null], minTotalScore: 300 }, 2)).toEqual({
      perChart: [{ ...emptyMetrics(), minScore: 100 }, emptyMetrics()],
      total: { ...emptyMetrics(), minScore: 300 },
    });
  });

  it("空オブジェクトや不正な形式は未設定として扱う", () => {
    expect(readClearCondition({}, 1)).toEqual({ perChart: [emptyMetrics()], total: emptyMetrics() });
    expect(readClearCondition({ perChart: [{ minScore: "x", maxMiss: -1 }], total: { maxDamage: 1.5 } }, 1)).toEqual({
      perChart: [emptyMetrics()],
      total: emptyMetrics(),
    });
    expect(readClearCondition(null, 1)).toEqual({ perChart: [emptyMetrics()], total: emptyMetrics() });
  });
});
