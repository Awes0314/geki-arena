const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const COMPETITION_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "22222222-2222-4222-8222-222222222222";

const getAdminUser = jest.fn();
const recordOperation = jest.fn();
const update = jest.fn();
let updateResult: { data: unknown[] | null; error: { message: string } | null };

jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/admin/guard", () => ({ getAdminUser: () => getAdminUser() }));
jest.mock("@/lib/logging/operation-log", () => ({ recordOperation: (...args: unknown[]) => recordOperation(...args) }));
jest.mock("@/lib/supabase/admin", () => {
  const chain: Record<string, unknown> = {
    eq: () => chain,
    is: () => chain,
    select: async () => updateResult,
  };
  return {
    createAdminClient: () => ({
      from: () => ({
        update: (values: unknown) => {
          update(values);
          return chain;
        },
      }),
    }),
  };
});

import { adminDeleteCompetition, adminRemoveParticipant } from "@/lib/admin/competition-actions";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  getAdminUser.mockResolvedValue({ id: ADMIN_ID, role: "admin" });
});

describe("adminDeleteCompetition", () => {
  it("運営以外はFORBIDDEN", async () => {
    getAdminUser.mockResolvedValue(null);
    const state = await adminDeleteCompetition(null, form({ competitionId: COMPETITION_ID }));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(update).not.toHaveBeenCalled();
  });

  it("不正なIDはVALIDATION_ERROR", async () => {
    const state = await adminDeleteCompetition(null, form({ competitionId: "x" }));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("対象がなければNOT_FOUND", async () => {
    updateResult = { data: [], error: null };
    const state = await adminDeleteCompetition(null, form({ competitionId: COMPETITION_ID }));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(recordOperation).not.toHaveBeenCalled();
  });

  it("論理削除して操作ログを記録する", async () => {
    updateResult = { data: [{ id: COMPETITION_ID, name: "test" }], error: null };
    const state = await adminDeleteCompetition(null, form({ competitionId: COMPETITION_ID }));
    expect(state?.result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ deleted_by: ADMIN_ID }));
    expect(recordOperation).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "competition_delete", targetId: COMPETITION_ID }),
    );
  });
});

describe("adminRemoveParticipant", () => {
  it("参加を取り消して操作ログを記録する", async () => {
    updateResult = { data: [{ user_id: USER_ID }], error: null };
    const state = await adminRemoveParticipant(null, form({ competitionId: COMPETITION_ID, userId: USER_ID }));
    expect(state?.result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ removed_by: ADMIN_ID }));
    expect(recordOperation).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "participant_remove", detail: { userId: USER_ID } }),
    );
  });

  it("対象の参加者がいなければNOT_FOUND", async () => {
    updateResult = { data: [], error: null };
    const state = await adminRemoveParticipant(null, form({ competitionId: COMPETITION_ID, userId: USER_ID }));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("DBエラー時はINTERNAL_ERROR", async () => {
    updateResult = { data: null, error: { message: "boom" } };
    const state = await adminRemoveParticipant(null, form({ competitionId: COMPETITION_ID, userId: USER_ID }));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "INTERNAL_ERROR" } });
  });
});
