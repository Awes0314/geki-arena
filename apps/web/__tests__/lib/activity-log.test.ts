const insert = jest.fn();

jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ insert }) }),
}));

import { recordActivity, recordError } from "@/lib/logging/activity-log";

describe("recordActivity", () => {
  beforeEach(() => {
    insert.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("イベント種別とユーザーIDを保存する", async () => {
    insert.mockResolvedValue({ error: null });
    await recordActivity({ eventType: "login", userId: "u1" });
    expect(insert).toHaveBeenCalledWith({ event_type: "login", user_id: "u1", level: "info", detail: {} });
  });

  it("DBエラーでも例外を投げない", async () => {
    insert.mockResolvedValue({ error: { message: "boom" } });
    await expect(recordActivity({ eventType: "login" })).resolves.toBeUndefined();
  });

  it("insertが例外を投げても伝播しない", async () => {
    insert.mockRejectedValue(new Error("network"));
    await expect(recordActivity({ eventType: "login" })).resolves.toBeUndefined();
  });
});

describe("recordError", () => {
  beforeEach(() => {
    insert.mockReset();
    insert.mockResolvedValue({ error: null });
  });

  it("errorレベルで記録し、メッセージを300文字に切り詰める", async () => {
    await recordError("ctx", new Error("x".repeat(500)));
    const arg = insert.mock.calls[0][0];
    expect(arg.event_type).toBe("error");
    expect(arg.level).toBe("error");
    expect(arg.detail.message).toHaveLength(300);
  });
});
