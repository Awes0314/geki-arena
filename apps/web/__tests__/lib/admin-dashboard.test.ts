const builder = (count: number | null, error: { message: string } | null = null) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["eq", "neq", "is", "lte", "gt", "gte"]) chain[method] = () => chain;
  chain.then = (resolve: (value: unknown) => unknown) => resolve({ count, error });
  return chain;
};

let nextBuilder: () => unknown;

jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => nextBuilder() }) }),
}));

import { getDashboardStats } from "@/lib/admin/dashboard";

describe("getDashboardStats", () => {
  it("各集計値と期間ごとの集計を返す", async () => {
    nextBuilder = () => builder(3);
    const stats = await getDashboardStats(new Date("2026-10-16T00:00:00Z"));
    expect(stats.users).toEqual({ total: 3, active: 3, suspended: 3 });
    expect(stats.openReports).toBe(3);
    expect(stats.periods.map((p) => p.label)).toEqual(["直近24時間", "直近7日間"]);
    expect(stats.periods[0]).toMatchObject({ submissions: 3, logins: 3, errors: 3 });
  });

  it("countがnullの場合は0として扱う", async () => {
    nextBuilder = () => builder(null);
    const stats = await getDashboardStats();
    expect(stats.users.total).toBe(0);
  });

  it("クエリエラー時は例外を投げる", async () => {
    nextBuilder = () => builder(null, { message: "boom" });
    await expect(getDashboardStats()).rejects.toThrow("dashboard count failed: boom");
  });
});
