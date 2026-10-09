/** @jest-environment node */
import { generateRecoveryCode, hashRecoveryCode, normalizeRecoveryCode } from "@/lib/auth/recovery-code";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

describe("recovery code", () => {
  it("4文字で、混同しやすい文字を含まない", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateRecoveryCode()).toMatch(/^[A-HJKMNP-Z2-9]{4}$/);
    }
  });

  it("生成のたびに異なる", () => {
    expect(generateRecoveryCode()).not.toBe(generateRecoveryCode());
  });

  it("小文字・ハイフン・空白の違いを吸収して同じハッシュになる", () => {
    expect(normalizeRecoveryCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(hashRecoveryCode("abcd-efgh")).toBe(hashRecoveryCode("ABCDEFGH"));
    expect(hashRecoveryCode("ABCDEFGH")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("registerSchema", () => {
  const valid = { userId: "Alice_01", password: "password123", passwordConfirm: "password123" };

  it("userIdを小文字に正規化する", () => {
    expect(registerSchema.parse(valid).userId).toBe("alice_01");
  });

  it.each(["ab", "a".repeat(21), "あいう", "a-b", "a b", "a@b"])("不正なuserIdを拒否する: %s", (userId) => {
    expect(registerSchema.safeParse({ ...valid, userId }).success).toBe(false);
  });

  it("パスワードは8〜128文字", () => {
    expect(registerSchema.safeParse({ ...valid, password: "a".repeat(7), passwordConfirm: "a".repeat(7) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "a".repeat(129), passwordConfirm: "a".repeat(129) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "a".repeat(128), passwordConfirm: "a".repeat(128) }).success).toBe(true);
  });

  it("確認用パスワードが一致しない場合は拒否する", () => {
    const result = registerSchema.safeParse({ ...valid, passwordConfirm: "different123" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["passwordConfirm"]);
  });
});

describe("loginSchema", () => {
  it("userIdを小文字に正規化する", () => {
    expect(loginSchema.parse({ userId: " Alice ", password: "x" }).userId).toBe("alice");
  });
});
