const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const MATCH_ID = "44444444-4444-4444-8444-444444444444";

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

import { adminDeleteMatch } from "@/lib/admin/one-v-one-actions";

function form(matchId: string) {
  const data = new FormData();
  data.set("matchId", matchId);
  return data;
}

describe("adminDeleteMatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    getAdminUser.mockResolvedValue({ id: ADMIN_ID, role: "admin" });
  });

  it("運営以外はFORBIDDEN", async () => {
    getAdminUser.mockResolvedValue(null);
    const state = await adminDeleteMatch(null, form(MATCH_ID));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(update).not.toHaveBeenCalled();
  });

  it("不正なIDはVALIDATION_ERROR", async () => {
    const state = await adminDeleteMatch(null, form("x"));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("対象がなければNOT_FOUND", async () => {
    updateResult = { data: [], error: null };
    const state = await adminDeleteMatch(null, form(MATCH_ID));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(recordOperation).not.toHaveBeenCalled();
  });

  it("状態によらず削除し、操作ログを記録する", async () => {
    updateResult = { data: [{ id: MATCH_ID }], error: null };
    const state = await adminDeleteMatch(null, form(MATCH_ID));
    expect(state?.result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "deleted", deleted_by: ADMIN_ID }));
    expect(recordOperation).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "one_v_one_delete", targetId: MATCH_ID }),
    );
  });
});
