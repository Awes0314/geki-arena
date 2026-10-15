import { checkParticipationCondition } from "@/lib/competition/participation";
import {
  formatJstDateTime,
  getCompetitionStatus,
  getDefaultPeriod,
  parseJstDateTime,
  validatePeriod,
} from "@/lib/competition/period";
import { computeParticipantScore, computeRanking, type RankingSubmission } from "@/lib/competition/ranking";
import {
  groupCandidatesByChart,
  selectContinuousPlays,
  type MatchedPlay,
} from "@/lib/competition/selection";
import { parseCompetitionForm } from "@/lib/validation/competition";
import { filterCompetitions, type FilterableCompetition } from "@/lib/competition/list-filter";
import { levelToNumber } from "@/lib/competition/level";

const NOW = new Date("2026-10-12T00:00:00+09:00");

describe("getCompetitionStatus", () => {
  const start = "2026-10-13T00:00:00+09:00";
  const end = "2026-10-20T00:00:00+09:00";

  it("開始前は開催予定、期間中は開催中、終了後は終了となる", () => {
    expect(getCompetitionStatus(start, end, NOW)).toBe("scheduled");
    expect(getCompetitionStatus(start, end, new Date("2026-10-15T00:00:00+09:00"))).toBe("ongoing");
    expect(getCompetitionStatus(start, end, new Date("2026-10-20T00:00:00+09:00"))).toBe("finished");
  });
});

describe("parseJstDateTime / formatJstDateTime", () => {
  it("JSTの入力値をDateに変換し、JSTで整形する", () => {
    const date = parseJstDateTime("2026-10-13T20:30");
    expect(date?.toISOString()).toBe("2026-10-13T11:30:00.000Z");
    expect(formatJstDateTime(date!)).toBe("2026/10/13 20:30");
  });

  it("不正な形式はnullを返す", () => {
    expect(parseJstDateTime("2026-10-13")).toBeNull();
    expect(parseJstDateTime("")).toBeNull();
  });
});

describe("validatePeriod", () => {
  const start = parseJstDateTime("2026-10-13T00:00");

  it("24時間以上90日以内の10分単位の期間を受理する", () => {
    expect(validatePeriod(start, parseJstDateTime("2026-10-14T00:00"), NOW)).toEqual({});
    expect(validatePeriod(start, parseJstDateTime("2027-01-11T00:00"), NOW)).toEqual({});
  });

  it("24時間未満・90日超を拒否する", () => {
    expect(validatePeriod(start, parseJstDateTime("2026-10-13T23:50"), NOW).endAt).toBeDefined();
    expect(validatePeriod(start, parseJstDateTime("2027-01-11T00:10"), NOW).endAt).toBeDefined();
  });

  it("開始が現在以前、終了が開始以前、10分単位でない値を拒否する", () => {
    expect(validatePeriod(parseJstDateTime("2026-10-11T00:00"), parseJstDateTime("2026-10-14T00:00"), NOW).startAt).toBeDefined();
    expect(validatePeriod(start, parseJstDateTime("2026-10-12T00:00"), NOW).endAt).toBeDefined();
    expect(validatePeriod(parseJstDateTime("2026-10-13T00:05"), parseJstDateTime("2026-10-15T00:00"), NOW).startAt).toBeDefined();
  });

  it("未入力を拒否する", () => {
    expect(validatePeriod(null, null, NOW)).toEqual({
      startAt: expect.any(String),
      endAt: expect.any(String),
    });
  });
});

describe("parseCompetitionForm", () => {
  const chartA = "11111111-1111-4111-8111-111111111111";
  const chartB = "22222222-2222-4222-8222-222222222222";
  const valid = {
    name: "第1回大会",
    description: "",
    startAt: "2026-10-13T00:00",
    endAt: "2026-10-15T00:00",
    ratingMinId: "",
    ratingMaxId: "5",
    chartIds: `${chartA},${chartB}`,
    continuousPlayRequired: "on",
  };

  it("正しい入力を受理し、型変換する", () => {
    const result = parseCompetitionForm(valid, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.ratingMinId).toBeNull();
      expect(result.data.ratingMaxId).toBe(5);
      expect(result.data.continuousPlayRequired).toBe(true);
      expect(result.data.chartIds).toEqual([chartA, chartB]);
    }
  });

  it("大会名が空の場合を拒否する", () => {
    const result = parseCompetitionForm({ ...valid, name: " " }, NOW);
    expect(result.ok === false && result.fieldErrors.name).toBeTruthy();
  });

  it("課題曲が0曲・11曲・重複の場合を拒否する", () => {
    const ids = Array.from({ length: 11 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    for (const chartIds of ["", ids.join(","), `${chartA},${chartA}`]) {
      const result = parseCompetitionForm({ ...valid, chartIds }, NOW);
      expect(result.ok === false && result.fieldErrors.chartIds).toBeTruthy();
    }
  });
});

describe("checkParticipationCondition", () => {
  it("条件がなければ区分未設定でも参加できる", () => {
    expect(checkParticipationCondition(null, { min: null, max: null }).ok).toBe(true);
  });

  it("条件があり区分が未設定の場合は参加できない", () => {
    expect(checkParticipationCondition(null, { min: 3, max: null }).ok).toBe(false);
  });

  it("下限・上限の境界を含めて判定する", () => {
    const range = { min: 3, max: 5 };
    expect(checkParticipationCondition(2, range).ok).toBe(false);
    expect(checkParticipationCondition(3, range).ok).toBe(true);
    expect(checkParticipationCondition(5, range).ok).toBe(true);
    expect(checkParticipationCondition(6, range).ok).toBe(false);
  });
});

describe("computeParticipantScore / computeRanking", () => {
  const submission = (
    id: string,
    userId: string,
    submittedAt: string,
    songs: Array<[string, number]>,
  ): RankingSubmission => ({
    id,
    userId,
    submittedAt,
    songs: songs.map(([chartId, technicalScore]) => ({ chartId, technicalScore })),
  });

  it("単曲提出可: 課題曲ごとの最高スコアの合計を算出する（未提出は0点）", () => {
    const score = computeParticipantScore(
      [
        submission("s1", "u1", "2026-10-13T10:00:00Z", [["a", 900_000]]),
        submission("s2", "u1", "2026-10-13T11:00:00Z", [["a", 950_000], ["b", 800_000]]),
        submission("s3", "u1", "2026-10-13T12:00:00Z", [["a", 940_000]]),
      ],
      false,
    );
    expect(score).toEqual({ totalScore: 1_750_000, achievedAt: "2026-10-13T11:00:00Z", submissionId: "s2" });
  });

  it("連続プレイ必須: 1回の提出の合計が最大のものを採用する", () => {
    const score = computeParticipantScore(
      [
        submission("s1", "u1", "2026-10-13T10:00:00Z", [["a", 900_000], ["b", 900_000]]),
        submission("s2", "u1", "2026-10-13T11:00:00Z", [["a", 950_000], ["b", 800_000]]),
      ],
      true,
    );
    expect(score?.totalScore).toBe(1_800_000);
    expect(score?.submissionId).toBe("s1");
  });

  it("提出がない場合はnullを返す", () => {
    expect(computeParticipantScore([], false)).toBeNull();
  });

  it("同点は到達日時の早い方を上位とし、スコア降順で順位付けする", () => {
    const ranking = computeRanking(
      [
        submission("s1", "late", "2026-10-13T12:00:00Z", [["a", 900_000]]),
        submission("s2", "early", "2026-10-13T10:00:00Z", [["a", 900_000]]),
        submission("s3", "top", "2026-10-13T13:00:00Z", [["a", 1_000_000]]),
      ],
      false,
    );
    expect(ranking.map((entry) => [entry.userId, entry.rank])).toEqual([
      ["top", 1],
      ["early", 2],
      ["late", 3],
    ]);
  });
});

describe("selectContinuousPlays / groupCandidatesByChart", () => {
  const period = { startAt: new Date("2026-10-13T00:00:00+09:00"), endAt: new Date("2026-10-20T00:00:00+09:00") };

  const play = (idx: string, chartId: string | null, time: string, score: number): MatchedPlay => ({
    chartId,
    play: {
      idx,
      title: idx,
      difficulty: "MASTER",
      playDateTime: `2026-10-14T${time}:00+09:00`,
      technicalScore: score,
      jacketImageUrl: "x",
    },
  });

  it("課題曲の集合と一致し・30分以内で連続するプレイを、順不同で選ぶ", () => {
    const plays = [play("p3", "a", "10:40", 900), play("p2", "b", "10:10", 900), play("p1", "x", "10:00", 100)];
    expect(selectContinuousPlays(plays, ["a", "b"], period)?.map((entry) => entry.play.idx)).toEqual(["p2", "p3"]);
  });

  it("課題曲を重複してプレイしている組は候補にしない", () => {
    const plays = [play("p1", "a", "10:00", 1), play("p2", "a", "10:10", 1)];
    expect(selectContinuousPlays(plays, ["a", "b"], period)).toBeNull();
  });

  it("間隔が30分を超える場合や間に別のプレイが挟まる場合はnullを返す", () => {
    expect(selectContinuousPlays([play("p1", "a", "10:00", 1), play("p2", "b", "10:31", 1)], ["a", "b"], period)).toBeNull();
    expect(
      selectContinuousPlays(
        [play("p1", "a", "10:00", 1), play("p2", "x", "10:10", 1), play("p3", "b", "10:20", 1)],
        ["a", "b"],
        period,
      ),
    ).toBeNull();
  });

  it("候補が複数ある場合は合計スコアが最大の組を選ぶ", () => {
    const plays = [
      play("p1", "a", "10:00", 500),
      play("p2", "b", "10:10", 500),
      play("p3", "a", "11:00", 900),
      play("p4", "b", "11:10", 900),
    ];
    expect(selectContinuousPlays(plays, ["a", "b"], period)?.map((entry) => entry.play.idx)).toEqual(["p3", "p4"]);
  });

  it("開催期間外のプレイを候補にしない", () => {
    const outside: MatchedPlay = {
      chartId: "a",
      play: { ...play("old", "a", "10:00", 999).play, playDateTime: "2026-10-01T10:00:00+09:00" },
    };
    const grouped = groupCandidatesByChart([outside, play("in", "a", "10:00", 100)], ["a"], period);
    expect(grouped.get("a")?.map((entry) => entry.play.idx)).toEqual(["in"]);
  });

  it("課題曲ごとの候補をスコア降順で返す", () => {
    const grouped = groupCandidatesByChart(
      [play("low", "a", "10:00", 100), play("high", "a", "11:00", 900)],
      ["a", "b"],
      period,
    );
    expect(grouped.get("a")?.map((entry) => entry.play.idx)).toEqual(["high", "low"]);
    expect(grouped.get("b")).toEqual([]);
  });
});

describe("getDefaultPeriod", () => {
  it("開始は現在+30分以降の最も近い10分刻み、終了はその7日後（JST）", () => {
    expect(getDefaultPeriod(new Date("2026-10-12T10:03:00+09:00"))).toEqual({
      startAt: "2026-10-12T10:40",
      endAt: "2026-10-19T10:40",
    });
    expect(getDefaultPeriod(new Date("2026-10-12T10:10:00+09:00")).startAt).toBe("2026-10-12T10:40");
  });
});

describe("levelToNumber", () => {
  it("+付きは+0.5として数値化し、不正な値はnullを返す", () => {
    expect(levelToNumber("13")).toBe(13);
    expect(levelToNumber("13+")).toBe(13.5);
    expect(levelToNumber("abc")).toBeNull();
  });
});

describe("filterCompetitions", () => {
  const base: FilterableCompetition = {
    name: "春の大会",
    status: "ongoing",
    organizer: { displayName: "alice" },
    ratingMin: null,
    ratingMax: null,
    targetCharts: [
      { title: "Song A", level: "13" },
      { title: "Song B", level: "14+" },
    ],
  };
  const criteria = { query: "", levelMin: null, levelMax: null, eligibleOnly: false, viewerRatingOrder: null };

  it("主催者名・大会名・楽曲名のいずれかに部分一致（大文字小文字無視）した大会のみ残す", () => {
    expect(filterCompetitions([base], { ...criteria, query: "ALI" })).toHaveLength(1);
    expect(filterCompetitions([base], { ...criteria, query: "春" })).toHaveLength(1);
    expect(filterCompetitions([base], { ...criteria, query: "song b" })).toHaveLength(1);
    expect(filterCompetitions([base], { ...criteria, query: "zzz" })).toHaveLength(0);
  });

  it("課題曲がすべてレベル範囲内の大会のみ残す", () => {
    expect(filterCompetitions([base], { ...criteria, levelMin: 13, levelMax: 14.5 })).toHaveLength(1);
    expect(filterCompetitions([base], { ...criteria, levelMin: 14 })).toHaveLength(0);
    expect(filterCompetitions([base], { ...criteria, levelMax: 13.5 })).toHaveLength(0);
  });

  it("参加可能のみ: 条件を満たす大会だけ残し、終了済みは除く", () => {
    const limited = { ...base, ratingMin: { sortOrder: 5 }, ratingMax: { sortOrder: 8 } };
    const finished = { ...base, status: "finished" as const };
    const eligible = { ...criteria, eligibleOnly: true, viewerRatingOrder: 6 };
    expect(filterCompetitions([base, limited, finished], eligible)).toEqual([base, limited]);
    expect(filterCompetitions([limited], { ...eligible, viewerRatingOrder: 9 })).toHaveLength(0);
  });

  it("参加可能のみでもRating区分が未設定の場合は絞り込まない", () => {
    const limited = { ...base, ratingMin: { sortOrder: 5 }, ratingMax: null };
    expect(filterCompetitions([limited], { ...criteria, eligibleOnly: true })).toHaveLength(1);
  });
});
