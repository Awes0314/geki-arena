import { filterMatches, isCreatorTitleHidden } from "@/lib/one-v-one/list-filter";
import {
  formatLevelNumber,
  formatMusicRange,
  isChartInRange,
  levelsInRange,
} from "@/lib/one-v-one/music-range";
import { computeEndAt, decideOutcome, getMatchStatus } from "@/lib/one-v-one/status";
import { isDuplicatePlay } from "@/lib/score-submission/duplicates";
import { parseMusicRange, parseOneVOneForm } from "@/lib/validation/one-v-one";

const CHART_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

describe("computeEndAt", () => {
  it("成立日の14日後の日本時間23:59になる", () => {
    const end = computeEndAt(new Date("2026-10-15T10:00:00+09:00"));
    expect(end.toISOString()).toBe(new Date("2026-10-29T23:59:00+09:00").toISOString());
  });

  it("日本時間で日付が変わった直後でもJSTの日付を基準にする", () => {
    // UTCでは前日の15:30だが、JSTでは10/16
    const end = computeEndAt(new Date("2026-10-16T00:30:00+09:00"));
    expect(end.toISOString()).toBe(new Date("2026-10-30T23:59:00+09:00").toISOString());
  });
});

describe("getMatchStatus", () => {
  const now = new Date("2026-10-15T12:00:00+09:00");
  const createdAt = "2026-10-10T12:00:00+09:00";

  it("削除済みはnullになる", () => {
    expect(getMatchStatus({ status: "deleted", createdAt, endAt: null }, now)).toBeNull();
  });

  it("成立前は保存された状態を返す", () => {
    expect(getMatchStatus({ status: "recruiting", createdAt, endAt: null }, now)).toBe("recruiting");
    expect(getMatchStatus({ status: "pending_acceptance", createdAt, endAt: null }, now)).toBe("pending_acceptance");
  });

  it("成立前でも作成から14日経過すると期限切れになる", () => {
    const later = new Date("2026-10-24T12:00:00+09:00");
    expect(getMatchStatus({ status: "recruiting", createdAt, endAt: null }, later)).toBe("expired");
  });

  it("成立後は終了日時の前後で対戦中と終了になり、期限切れにならない", () => {
    const endAt = "2026-10-29T23:59:00+09:00";
    expect(getMatchStatus({ status: "established", createdAt, endAt }, now)).toBe("established");
    expect(getMatchStatus({ status: "established", createdAt, endAt }, new Date(endAt))).toBe("finished");
  });
});

describe("decideOutcome", () => {
  it("合計スコアが高い方が勝ち、同点は引き分けとなる", () => {
    expect(decideOutcome(3000000, 2900000)).toBe("creator_win");
    expect(decideOutcome(2900000, 3000000)).toBe("opponent_win");
    expect(decideOutcome(3000000, 3000000)).toBe("draw");
  });

  it("片方のみ提出した場合は提出者の勝ち、両者未提出は引き分けとなる", () => {
    expect(decideOutcome(1000, null)).toBe("creator_win");
    expect(decideOutcome(null, 1000)).toBe("opponent_win");
    expect(decideOutcome(null, null)).toBe("draw");
  });
});

describe("music range", () => {
  it("レベル範囲に含まれるレベル表示値を返す", () => {
    expect(levelsInRange({ type: "level", min: 13, max: 14 })).toEqual(["14", "13+", "13"]);
  });

  it("レベル・譜面定数で範囲内判定できる", () => {
    const chart = { level: "13+", chartConstant: 13.6 };
    expect(isChartInRange(chart, { type: "level", min: 13.5, max: 14 })).toBe(true);
    expect(isChartInRange(chart, { type: "level", min: 14, max: 15 })).toBe(false);
    expect(isChartInRange(chart, { type: "chart_constant", min: 13.0, max: 13.6 })).toBe(true);
    expect(isChartInRange(chart, { type: "chart_constant", min: 13.7, max: 14.0 })).toBe(false);
  });

  it("範囲を表示用文字列に変換する", () => {
    expect(formatLevelNumber(13.5)).toBe("13+");
    expect(formatMusicRange({ type: "level", min: 13, max: 14.5 })).toBe("Lv.13 〜 Lv.14+");
    expect(formatMusicRange({ type: "chart_constant", min: 13, max: 14.5 })).toBe("譜面定数 13.0 〜 14.5");
  });
});

describe("parseMusicRange", () => {
  it("レベル範囲を数値に変換する", () => {
    expect(parseMusicRange({ rangeType: "level", rangeMin: "13", rangeMax: "14+" })).toEqual({
      ok: true,
      range: { type: "level", min: 13, max: 14.5 },
    });
  });

  it("下限が上限を超える場合と未指定はエラーになる", () => {
    const reversed = parseMusicRange({ rangeType: "chart_constant", rangeMin: "14.0", rangeMax: "13.0" });
    expect(reversed).toMatchObject({ ok: false, fieldErrors: { rangeMax: expect.any(String) } });
    const empty = parseMusicRange({ rangeType: "level", rangeMin: "", rangeMax: "" });
    expect(empty).toMatchObject({ ok: false, fieldErrors: { rangeMin: expect.any(String), rangeMax: expect.any(String) } });
  });

  it("不正な種別・譜面定数はエラーになる", () => {
    expect(parseMusicRange({ rangeType: "other", rangeMin: "1", rangeMax: "2" }).ok).toBe(false);
    expect(parseMusicRange({ rangeType: "chart_constant", rangeMin: "13.55", rangeMax: "14" }).ok).toBe(false);
    expect(parseMusicRange({ rangeType: "chart_constant", rangeMin: "13", rangeMax: "21" }).ok).toBe(false);
  });
});

describe("parseOneVOneForm", () => {
  const base = { creatorChartId: CHART_ID, rangeType: "level", rangeMin: "13", rangeMax: "14" };

  it("対戦相手を指定しない場合はRating区分範囲を受け付ける", () => {
    const parsed = parseOneVOneForm({ ...base, ratingMinId: "2", ratingMaxId: "" });
    expect(parsed).toMatchObject({
      ok: true,
      data: { opponentUserId: null, ratingMinId: 2, ratingMaxId: null },
    });
  });

  it("対戦相手を指定する場合は相手が必須で、Rating区分範囲は無視される", () => {
    expect(parseOneVOneForm({ ...base, hasOpponent: "on" })).toMatchObject({
      ok: false,
      fieldErrors: { opponentUserId: expect.any(String) },
    });
    expect(parseOneVOneForm({ ...base, hasOpponent: "on", opponentUserId: USER_ID, ratingMinId: "2" })).toMatchObject({
      ok: true,
      data: { opponentUserId: USER_ID, ratingMinId: null },
    });
  });

  it("自選楽曲が未指定の場合はエラーになる", () => {
    expect(parseOneVOneForm({ ...base, creatorChartId: "" })).toMatchObject({
      ok: false,
      fieldErrors: { creatorChartId: expect.any(String) },
    });
  });
});

describe("isDuplicatePlay", () => {
  const existing = [
    {
      id: "s1",
      userId: "u1",
      submittedAt: "2026-10-15T00:00:00Z",
      songs: [{ chartId: "c1", technicalScore: 1000000, playDateTime: "2026-10-15T10:00:00+09:00" }],
    },
  ];
  const play = (technicalScore: number, playDateTime: string) => ({
    chartId: "c1",
    play: { technicalScore, playDateTime } as never,
  });

  it("譜面・プレイ日時・スコアがすべて同一の場合のみ重複とみなす", () => {
    expect(isDuplicatePlay(existing, play(1000000, "2026-10-15T10:00:00+09:00"))).toBe(true);
    expect(isDuplicatePlay(existing, play(999999, "2026-10-15T10:00:00+09:00"))).toBe(false);
    expect(isDuplicatePlay(existing, play(1000000, "2026-10-15T10:10:00+09:00"))).toBe(false);
  });
});

describe("filterMatches", () => {
  const match = (status: "recruiting" | "established", isCreator: boolean) => ({
    status,
    isCreator,
    creator: { displayName: "Alice" },
    opponent: null,
    creatorChart: { title: "Secret Song" },
    opponentChart: null,
    randomChart: null,
  });

  it("成立前は作成者以外に作成者選曲の楽曲名を伏せる", () => {
    expect(isCreatorTitleHidden(match("recruiting", false))).toBe(true);
    expect(isCreatorTitleHidden(match("recruiting", true))).toBe(false);
    expect(isCreatorTitleHidden(match("established", false))).toBe(false);
  });

  it("ユーザー名・楽曲名で絞り込み、伏せている楽曲名は検索対象にならない", () => {
    const items = [match("recruiting", false), match("established", false)];
    expect(filterMatches(items, "alice")).toHaveLength(2);
    expect(filterMatches(items, "secret")).toEqual([items[1]]);
    expect(filterMatches(items, "  ")).toHaveLength(2);
  });
});
