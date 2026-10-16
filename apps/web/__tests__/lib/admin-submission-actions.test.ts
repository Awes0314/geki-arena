const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const SUBMISSION_ID = "55555555-5555-4555-8555-555555555555";
const OTHER_SUBMISSION_ID = "66666666-6666-4666-8666-666666666666";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const CONTEXT_ID = "33333333-3333-4333-8333-333333333333";

const getAdminUser = jest.fn();
const recordOperation = jest.fn();
const fetchValidSubmissions = jest.fn();
const calls: { table: string; op: string; values?: unknown }[] = [];
const rows: Record<string, unknown> = {};

jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/admin/guard", () => ({ getAdminUser: () => getAdminUser() }));
jest.mock("@/lib/logging/operation-log", () => ({ recordOperation: (...args: unknown[]) => recordOperation(...args) }));
jest.mock("@/lib/score-submission/queries", () => ({
  fetchValidSubmissions: (...args: unknown[]) => fetchValidSubmissions(...args),
}));
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
        update: (values: unknown) => {
          calls.push({ table, op: "update", values });
          return chain;
        },
        delete: () => {
          calls.push({ table, op: "delete" });
          return chain;
        },
        then: (resolve: (value: unknown) => unknown) => resolve({ error: null }),
      };
      return chain;
    },
  }),
}));

import { adminDeleteSubmission } from "@/lib/admin/submission-actions";

function form(submissionId: string) {
  const data = new FormData();
  data.set("submissionId", submissionId);
  return data;
}

const submission = (id: string, score: number) => ({
  id,
  userId: USER_ID,
  submittedAt: "2026-10-01T00:00:00Z",
  songs: [{ chartId: "chart-1", technicalScore: score }],
});

function target(contextType: string) {
  rows.score_submissions = {
    id: SUBMISSION_ID,
    submitter_id: USER_ID,
    context_type: contextType,
    context_id: CONTEXT_ID,
    total_score: 1000,
  };
}

describe("adminDeleteSubmission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
    for (const key of Object.keys(rows)) delete rows[key];
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    getAdminUser.mockResolvedValue({ id: ADMIN_ID, role: "admin" });
    fetchValidSubmissions.mockResolvedValue([submission(SUBMISSION_ID, 1000), submission(OTHER_SUBMISSION_ID, 800)]);
  });

  it("運営以外はFORBIDDEN", async () => {
    getAdminUser.mockResolvedValue(null);
    const state = await adminDeleteSubmission(null, form(SUBMISSION_ID));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(calls).toHaveLength(0);
  });

  it("提出が存在しなければNOT_FOUND", async () => {
    const state = await adminDeleteSubmission(null, form(SUBMISSION_ID));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("大会: 残りの提出からベストを再計算して削除する", async () => {
    target("competition");
    rows.competitions = { continuous_play_required: true };
    const state = await adminDeleteSubmission(null, form(SUBMISSION_ID));
    expect(state?.result.ok).toBe(true);
    expect(calls).toContainEqual({
      table: "competition_participants",
      op: "update",
      values: { best_submission_id: OTHER_SUBMISSION_ID },
    });
    expect(calls.map((call) => `${call.table}:${call.op}`).slice(-2)).toEqual([
      "song_scores:delete",
      "score_submissions:delete",
    ]);
    expect(recordOperation).toHaveBeenCalledWith(expect.objectContaining({ actionType: "score_delete" }));
  });

  it("大会: 残りの提出がなければベストをNULLにする", async () => {
    target("competition");
    rows.competitions = { continuous_play_required: true };
    fetchValidSubmissions.mockResolvedValue([submission(SUBMISSION_ID, 1000)]);
    await adminDeleteSubmission(null, form(SUBMISSION_ID));
    expect(calls).toContainEqual({
      table: "competition_participants",
      op: "update",
      values: { best_submission_id: null },
    });
  });

  it("1v1: 作成者側の参照を再計算する", async () => {
    target("one_v_one");
    rows.one_v_one_matches = { creator_id: USER_ID, opponent_user_id: null };
    await adminDeleteSubmission(null, form(SUBMISSION_ID));
    expect(calls).toContainEqual({
      table: "one_v_one_matches",
      op: "update",
      values: { creator_submission_id: OTHER_SUBMISSION_ID },
    });
  });

  it("コース: 参照している挑戦結果を削除する", async () => {
    target("course");
    await adminDeleteSubmission(null, form(SUBMISSION_ID));
    expect(calls).toContainEqual({ table: "course_challenge_results", op: "delete" });
    expect(fetchValidSubmissions).not.toHaveBeenCalled();
  });
});
