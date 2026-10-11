/** @jest-environment node */
import {
  parsePongekiChart,
  planSync,
  toMusicId,
  type ExistingChart,
} from "@/lib/admin/pongeki-mapping";

const raw = (overrides: Record<string, unknown> = {}) => ({
  id: "abc123_MASTER_13plus",
  title: "Song",
  diff: "MASTER",
  level: "13+",
  chart_const: 13.7,
  jacket_image_url: "https://example.com/a.png",
  delete_flag: false,
  ...overrides,
});

const existing = (overrides: Partial<ExistingChart> = {}): ExistingChart => ({
  pongeki_chart_id: "abc123_MASTER_13plus",
  music_id: "abc123",
  difficulty_type: "MASTER",
  level: "13+",
  chart_constant: 13.7,
  jacket_image_url: "https://example.com/a.png",
  is_active: true,
  ...overrides,
});

describe("toMusicId", () => {
  it("譜面ID末尾の難易度・レベルを除いた部分を返す", () => {
    expect(toMusicId("b7dd_LUNATIC_0")).toBe("b7dd");
    expect(toMusicId("b7dd_LUNATIC_13plus")).toBe("b7dd");
  });

  it("形式が不正な場合は例外を投げる", () => {
    expect(() => toMusicId("invalid")).toThrow();
  });
});

describe("parsePongekiChart", () => {
  it("カラム値を変換し、delete_flagをisActiveへ反転する", () => {
    const chart = parsePongekiChart(raw({ delete_flag: true }));
    expect(chart).toMatchObject({ musicId: "abc123", level: "13+", chartConstant: 13.7, isActive: false });
  });

  it("未知の難易度を拒否する", () => {
    expect(() => parsePongekiChart(raw({ diff: "UNKNOWN" }))).toThrow();
  });
});

describe("planSync", () => {
  const plan = (pongeki: unknown[], current: ExistingChart[], titles = new Map<string, string>()) =>
    planSync(pongeki.map(parsePongekiChart), current, titles);

  it("未登録の有効な譜面を追加として数える", () => {
    const result = plan([raw()], []);
    expect(result.summary).toEqual({ added: 1, updated: 0, deactivated: 0 });
    expect(result.musics).toEqual([{ id: "abc123", title: "Song" }]);
  });

  it("未登録かつ削除済みの譜面は取り込まない", () => {
    const result = plan([raw({ delete_flag: true })], []);
    expect(result.charts).toHaveLength(0);
    expect(result.musics).toHaveLength(0);
  });

  it("変更がなければ書き込み対象にしない", () => {
    const result = plan([raw()], [existing()], new Map([["abc123", "Song"]]));
    expect(result.charts).toHaveLength(0);
    expect(result.summary).toEqual({ added: 0, updated: 0, deactivated: 0 });
  });

  it("値の変更を更新として数える", () => {
    const result = plan([raw({ chart_const: 14.0 })], [existing()], new Map([["abc123", "Song"]]));
    expect(result.summary.updated).toBe(1);
  });

  it("delete_flagがtrueになった譜面とPongekiから消えた譜面を無効化として数える", () => {
    const gone = existing({ pongeki_chart_id: "zzz_BASIC_1", music_id: "zzz", difficulty_type: "BASIC", level: "1" });
    const result = plan([raw({ delete_flag: true })], [existing(), gone]);
    expect(result.summary.deactivated).toBe(2);
    expect(result.deactivateChartIds).toEqual(["zzz_BASIC_1"]);
  });
});
