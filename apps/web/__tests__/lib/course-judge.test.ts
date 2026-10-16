import { emptyMetrics, type ClearCondition, type ConditionMetrics } from "@/lib/course-condition";
import { judgeCourse, requiresDetail, type JudgedSong } from "@/lib/course/judge";

const metrics = (overrides: Partial<ConditionMetrics>): ConditionMetrics => ({ ...emptyMetrics(), ...overrides });

const song = (technicalScore: number, detail: Partial<NonNullable<JudgedSong["detail"]>> = {}): JudgedSong => ({
  technicalScore,
  detail: { breakCount: 0, hitCount: 0, missCount: 0, bellObtained: 10, bellTotal: 10, damage: 0, ...detail },
});

describe("judgeCourse", () => {
  it("設定した条件をすべて満たすと合格する", () => {
    const condition: ClearCondition = {
      perChart: [metrics({ minScore: 1_000_000 }), metrics({ minScore: 990_000, maxMiss: 1 })],
      total: metrics({ minScore: 1_990_000 }),
    };
    const result = judgeCourse(condition, [song(1_000_000), song(990_000, { missCount: 1 })]);
    expect(result.passed).toBe(true);
  });

  it("曲個別の条件を1つでも満たさないと不合格になる", () => {
    const condition: ClearCondition = { perChart: [metrics({ minScore: 1_000_000 })], total: emptyMetrics() };
    expect(judgeCourse(condition, [song(999_999)]).passed).toBe(false);
  });

  it("通しの条件は全曲の合計で判定する", () => {
    const condition: ClearCondition = {
      perChart: [emptyMetrics(), emptyMetrics()],
      total: metrics({ maxMiss: 2, maxDamage: 3 }),
    };
    expect(judgeCourse(condition, [song(1, { missCount: 1, damage: 1 }), song(1, { missCount: 1, damage: 2 })]).passed).toBe(true);
    expect(judgeCourse(condition, [song(1, { missCount: 2 }), song(1, { missCount: 1 })]).passed).toBe(false);
  });

  it("BREAK以下はBREAK+HIT+MISS、HIT以下はHIT+MISSで数える", () => {
    const condition: ClearCondition = {
      perChart: [metrics({ maxBreakOrBelow: 5, maxHitOrBelow: 2 })],
      total: emptyMetrics(),
    };
    expect(judgeCourse(condition, [song(1, { breakCount: 3, hitCount: 1, missCount: 1 })]).passed).toBe(true);
    expect(judgeCourse(condition, [song(1, { breakCount: 3, hitCount: 2, missCount: 1 })]).passed).toBe(false);
  });

  it("BELL取りこぼしは最大BELL数から取得数を引いて数える", () => {
    const condition: ClearCondition = { perChart: [metrics({ maxBellMissed: 2 })], total: emptyMetrics() };
    expect(judgeCourse(condition, [song(1, { bellObtained: 8, bellTotal: 10 })]).passed).toBe(true);
    expect(judgeCourse(condition, [song(1, { bellObtained: 7, bellTotal: 10 })]).passed).toBe(false);
  });

  it("条件が未設定なら合格する", () => {
    const condition: ClearCondition = { perChart: [emptyMetrics()], total: emptyMetrics() };
    expect(judgeCourse(condition, [song(0)]).passed).toBe(true);
  });
});

describe("requiresDetail", () => {
  it("テクニカルスコア条件のみなら詳細は不要", () => {
    expect(requiresDetail({ perChart: [metrics({ minScore: 1 })], total: metrics({ minScore: 2 }) })).toBe(false);
  });

  it("スコア以外の条件があれば詳細が必要", () => {
    expect(requiresDetail({ perChart: [emptyMetrics()], total: metrics({ maxDamage: 0 }) })).toBe(true);
  });
});
