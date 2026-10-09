/** @jest-environment node */
import { isPublicPath } from "@/lib/auth/public-paths";
import { passwordResetSchema } from "@/lib/validation/auth";

describe("passwordResetSchema", () => {
  const valid = { userId: "Alice", recoveryCode: " abcd ", password: "newpassword1", passwordConfirm: "newpassword1" };

  it("有効な入力を受け付け、userIdを小文字に正規化する", () => {
    const parsed = passwordResetSchema.parse(valid);
    expect(parsed.userId).toBe("alice");
    expect(parsed.recoveryCode).toBe("abcd");
  });

  it("リカバリーコード未入力・短いパスワード・不一致を拒否する", () => {
    expect(passwordResetSchema.safeParse({ ...valid, recoveryCode: "" }).success).toBe(false);
    expect(passwordResetSchema.safeParse({ ...valid, password: "short", passwordConfirm: "short" }).success).toBe(false);
    expect(passwordResetSchema.safeParse({ ...valid, passwordConfirm: "other-password" }).success).toBe(false);
  });
});

describe("isPublicPath", () => {
  it.each(["/login", "/register", "/password-reset", "/login/"])("未ログインでもアクセス可能: %s", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(["/", "/users/12345", "/profile/edit", "/login-admin", "/registered"])("ログインが必要: %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
