import { matchChart, type ChartCandidate } from "@/lib/score-submission/chart-matching";

const chart = (over: Partial<ChartCandidate>): ChartCandidate => ({
  chartId: "c1",
  title: "Song",
  difficulty: "MASTER",
  level: "14",
  jacketImageUrl: null,
  ...over,
});

const play = { title: "Song", difficulty: "MASTER" as const, jacketImageUrl: "https://example.com/a.png" };

describe("matchChart", () => {
  it("楽曲名と難易度で一意に絞れる場合はその譜面を返す", () => {
    expect(matchChart(play, [chart({}), chart({ chartId: "c2", difficulty: "EXPERT" })])?.chartId).toBe("c1");
  });

  it("候補がない場合はnullを返す", () => {
    expect(matchChart(play, [chart({ title: "Other" })])).toBeNull();
  });

  it("候補が複数ある場合はジャケット画像URLで判別する", () => {
    const charts = [
      chart({ chartId: "lv0", level: "0", jacketImageUrl: "https://example.com/b.png" }),
      chart({ chartId: "lv13p", level: "13+", jacketImageUrl: "https://example.com/a.png" }),
    ];
    expect(matchChart(play, charts)?.level).toBe("13+");
  });

  it("ジャケットでも絞れない場合はnullを返す", () => {
    const charts = [chart({ chartId: "x" }), chart({ chartId: "y", level: "13+" })];
    expect(matchChart(play, charts)).toBeNull();
  });
});
