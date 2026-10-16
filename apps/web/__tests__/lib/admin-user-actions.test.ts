const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ID = "22222222-2222-4222-8222-222222222222";

const getAdminUser = jest.fn();
const recordOperation = jest.fn();
const updateUserById = jest.fn();
const statusUpdate = jest.fn();
let targetRow: { id: string; user_no: number; role: string; status: string } | null;

jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/admin/guard", () => ({ getAdminUser: () => getAdminUser() }));
jest.mock("@/lib/logging/operation-log", () => ({ recordOperation: (...args: unknown[]) => recordOperation(...args) }));
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: targetRow, error: null }) }) }),
      update: (values: unknown) => ({
        eq: async () => {
          statusUpdate(values);
          return { error: null };
        },
      }),
    }),
    auth: { admin: { updateUserById: (...args: unknown[]) => updateUserById(...args) } },
  }),
}));

import { suspendUser, unsuspendUser } from "@/lib/admin/user-actions";

function form(userId: string) {
  const data = new FormData();
  data.set("userId", userId);
  return data;
}

describe("suspendUser / unsuspendUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    getAdminUser.mockResolvedValue({ id: ADMIN_ID, role: "admin" });
    updateUserById.mockResolvedValue({ error: null });
    targetRow = { id: TARGET_ID, user_no: 12345, role: "general", status: "active" };
  });

  it("運営以外はFORBIDDEN", async () => {
    getAdminUser.mockResolvedValue(null);
    const state = await suspendUser(null, form(TARGET_ID));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(statusUpdate).not.toHaveBeenCalled();
  });

  it("不正なユーザーIDはVALIDATION_ERROR", async () => {
    const state = await suspendUser(null, form("not-uuid"));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("自分自身は操作できない", async () => {
    const state = await suspendUser(null, form(ADMIN_ID));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("運営ユーザーは停止できない", async () => {
    targetRow = { ...targetRow!, role: "admin" };
    const state = await suspendUser(null, form(TARGET_ID));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("有効なアカウントを停止し、BANと操作ログを記録する", async () => {
    const state = await suspendUser(null, form(TARGET_ID));
    expect(state?.result.ok).toBe(true);
    expect(statusUpdate).toHaveBeenCalledWith({ status: "suspended" });
    expect(updateUserById).toHaveBeenCalledWith(TARGET_ID, { ban_duration: "876000h" });
    expect(recordOperation).toHaveBeenCalledWith(
      expect.objectContaining({ operatorId: ADMIN_ID, actionType: "user_suspend", targetId: TARGET_ID }),
    );
  });

  it("停止中でないアカウントは解除できない", async () => {
    const state = await unsuspendUser(null, form(TARGET_ID));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("停止中のアカウントを解除する", async () => {
    targetRow = { ...targetRow!, status: "suspended" };
    const state = await unsuspendUser(null, form(TARGET_ID));
    expect(state?.result.ok).toBe(true);
    expect(statusUpdate).toHaveBeenCalledWith({ status: "active" });
    expect(updateUserById).toHaveBeenCalledWith(TARGET_ID, { ban_duration: "none" });
    expect(recordOperation).toHaveBeenCalledWith(expect.objectContaining({ actionType: "user_unsuspend" }));
  });
});
