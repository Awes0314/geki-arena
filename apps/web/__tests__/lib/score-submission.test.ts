import { parseBookmarkletPayload } from "@/lib/score-submission/schema";

const validPlay = {
  idx: "1",
  title: "Perfect Shining!!",
  difficulty: "LUNATIC",
  playDateTime: "2026-10-11T12:34:00+09:00",
  technicalScore: 1_000_000,
  jacketImageUrl: "https://ongeki-net.com/ongeki-mobile/img/music/bacbd6ad4f2f6df4.png",
};

const payload = (plays: unknown[], mode = "tournament") => ({ schema: "bookmarklet.v1", mode, plays });

describe("parseBookmarkletPayload", () => {
  it("正しいデータを受理する", () => {
    expect(parseBookmarkletPayload(payload([validPlay]))?.plays).toHaveLength(1);
  });

  it("スキーマバージョンが異なる場合はnullを返す", () => {
    expect(parseBookmarkletPayload({ ...payload([validPlay]), schema: "bookmarklet.v0" })).toBeNull();
  });

  it("テクニカルスコアが上限を超える場合はnullを返す", () => {
    expect(parseBookmarkletPayload(payload([{ ...validPlay, technicalScore: 1_010_001 }]))).toBeNull();
  });

  it("不正な難易度はnullを返す", () => {
    expect(parseBookmarkletPayload(payload([{ ...validPlay, difficulty: "ULTIMA" }]))).toBeNull();
  });

  it("JST以外の日時形式はnullを返す", () => {
    expect(parseBookmarkletPayload(payload([{ ...validPlay, playDateTime: "2026-10-11T12:34:00Z" }]))).toBeNull();
  });

  it("コース用の詳細属性を受理し、負数はnullを返す", () => {
    const detail = {
      maxCombo: 1,
      criticalBreak: 0,
      break: 0,
      hit: 0,
      miss: 0,
      bell: { obtained: 1, total: 2 },
      damage: 0,
    };
    expect(parseBookmarkletPayload(payload([{ ...validPlay, detail }], "course"))).not.toBeNull();
    expect(parseBookmarkletPayload(payload([{ ...validPlay, detail: { ...detail, miss: -1 } }], "course"))).toBeNull();
  });

  it("51件以上はnullを返す", () => {
    expect(parseBookmarkletPayload(payload(Array(51).fill(validPlay)))).toBeNull();
  });
});
