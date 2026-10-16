const eq = jest.fn();
const range = jest.fn();
let result: { data: unknown[] | null; count: number | null; error: { message: string } | null };

const chain: Record<string, unknown> = {
  select: () => chain,
  order: () => chain,
  overrideTypes: () => chain,
  range: (...args: unknown[]) => {
    range(...args);
    return chain;
  },
  eq: (...args: unknown[]) => {
    eq(...args);
    return chain;
  },
  then: (resolve: (value: unknown) => unknown) => resolve(result),
};

jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => chain }) }));

import { ADMIN_LOG_PAGE_SIZE, listActivityLogs, listOperationLogs } from "@/lib/admin/log-queries";

beforeEach(() => {
  eq.mockClear();
  range.mockClear();
  result = { data: [], count: 0, error: null };
});

describe("listActivityLogs", () => {
  it("種別とページに応じて絞り込み・範囲指定する", async () => {
    await listActivityLogs("login", 2);
    expect(eq).toHaveBeenCalledWith("event_type", "login");
    expect(range).toHaveBeenCalledWith(ADMIN_LOG_PAGE_SIZE, ADMIN_LOG_PAGE_SIZE * 2 - 1);
  });

  it("種別未指定なら絞り込まない", async () => {
    await listActivityLogs(null, 1);
    expect(eq).not.toHaveBeenCalled();
  });

  it("行をアプリ用の形に変換する", async () => {
    result = {
      data: [
        {
          id: "1",
          event_type: "error",
          level: "error",
          created_at: "2026-10-16T00:00:00Z",
          detail: { context: "x" },
          user: { user_no: 12345, display_name: "alice" },
        },
      ],
      count: 1,
      error: null,
    };
    const { items, total } = await listActivityLogs(null, 1);
    expect(total).toBe(1);
    expect(items[0]).toMatchObject({ eventType: "error", user: { userNo: 12345, displayName: "alice" } });
  });

  it("エラー時は例外を投げる", async () => {
    result = { data: null, count: null, error: { message: "boom" } };
    await expect(listActivityLogs(null, 1)).rejects.toThrow("failed to fetch activity logs: boom");
  });
});

describe("listOperationLogs", () => {
  it("操作種別で絞り込み、実行者がいなければnullにする", async () => {
    result = {
      data: [
        {
          id: "1",
          action_type: "score_delete",
          target_type: "score_submission",
          target_id: "t",
          created_at: "2026-10-16T00:00:00Z",
          detail: {},
          operator: null,
        },
      ],
      count: 1,
      error: null,
    };
    const { items } = await listOperationLogs("score_delete", 1);
    expect(eq).toHaveBeenCalledWith("action_type", "score_delete");
    expect(items[0]).toMatchObject({ actionType: "score_delete", operator: null });
  });

  it("エラー時は例外を投げる", async () => {
    result = { data: null, count: null, error: { message: "boom" } };
    await expect(listOperationLogs(null, 1)).rejects.toThrow("failed to fetch operation logs: boom");
  });
});
