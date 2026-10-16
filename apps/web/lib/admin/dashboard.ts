import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type DashboardStats = {
  users: { total: number; active: number; suspended: number };
  competitions: { ongoing: number; total: number };
  oneVOne: { recruiting: number; established: number; total: number };
  openReports: number;
  /** 直近24時間 / 7日間の集計 */
  periods: { label: string; submissions: number; logins: number; errors: number; competitionsCreated: number }[];
};

const HOUR_MS = 60 * 60 * 1000;
const PERIODS = [
  { label: "直近24時間", ms: 24 * HOUR_MS },
  { label: "直近7日間", ms: 7 * 24 * HOUR_MS },
] as const;

async function count(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count: value, error } = await query;
  if (error) throw new Error(`dashboard count failed: ${error.message}`);
  return value ?? 0;
}

/** 運営ダッシュボードの集計値を取得する。 */
export async function getDashboardStats(now: Date = new Date()): Promise<DashboardStats> {
  const admin = createAdminClient();
  const head = { count: "exact", head: true } as const;
  const nowIso = now.toISOString();

  const [total, active, suspended, ongoing, competitionTotal, recruiting, established, matchTotal, openReports] =
    await Promise.all([
      count(admin.from("users").select("id", head)),
      count(admin.from("users").select("id", head).eq("status", "active")),
      count(admin.from("users").select("id", head).eq("status", "suspended")),
      count(
        admin.from("competitions").select("id", head).is("deleted_at", null).lte("start_at", nowIso).gt("end_at", nowIso),
      ),
      count(admin.from("competitions").select("id", head).is("deleted_at", null)),
      count(admin.from("one_v_one_matches").select("id", head).eq("status", "recruiting")),
      count(admin.from("one_v_one_matches").select("id", head).eq("status", "established")),
      count(admin.from("one_v_one_matches").select("id", head).neq("status", "deleted")),
      count(admin.from("reports").select("id", head).eq("status", "open")),
    ]);

  const periods = await Promise.all(
    PERIODS.map(async ({ label, ms }) => {
      const since = new Date(now.getTime() - ms).toISOString();
      const [submissions, logins, errors, competitionsCreated] = await Promise.all([
        count(admin.from("score_submissions").select("id", head).gte("submitted_at", since)),
        count(admin.from("activity_logs").select("id", head).eq("event_type", "login").gte("created_at", since)),
        count(admin.from("activity_logs").select("id", head).eq("level", "error").gte("created_at", since)),
        count(admin.from("competitions").select("id", head).gte("created_at", since)),
      ]);
      return { label, submissions, logins, errors, competitionsCreated };
    }),
  );

  return {
    users: { total, active, suspended },
    competitions: { ongoing, total: competitionTotal },
    oneVOne: { recruiting, established, total: matchTotal },
    openReports,
    periods,
  };
}
