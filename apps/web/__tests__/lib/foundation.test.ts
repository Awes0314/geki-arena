import { userIdToInternalEmail } from "@/lib/auth/internal-email";
import { formDataToValues } from "@/lib/actions/result";
import { getNavItems } from "@/lib/navigation";

describe("userIdToInternalEmail", () => {
  const original = process.env.SUPABASE_AUTH_INTERNAL_EMAIL_DOMAIN;
  afterEach(() => {
    process.env.SUPABASE_AUTH_INTERNAL_EMAIL_DOMAIN = original;
  });

  it("環境変数のドメインで疑似メールアドレスを生成する", () => {
    process.env.SUPABASE_AUTH_INTERNAL_EMAIL_DOMAIN = "geki-arena.internal";
    expect(userIdToInternalEmail("alice")).toBe("alice@geki-arena.internal");
  });

  it("ドメイン未設定の場合はエラーにする", () => {
    delete process.env.SUPABASE_AUTH_INTERNAL_EMAIL_DOMAIN;
    expect(() => userIdToInternalEmail("alice")).toThrow();
  });
});

describe("formDataToValues", () => {
  it("文字列項目のみを取り出す", () => {
    const formData = new FormData();
    formData.set("name", "a");
    formData.set("file", new File(["x"], "x.png"));
    expect(formDataToValues(formData)).toEqual({ name: "a" });
  });
});

describe("getNavItems", () => {
  it("未ログインではプロフィールを表示しない", () => {
    expect(getNavItems(null).map((item) => item.label)).toEqual(["ホーム"]);
  });

  it("ログイン済みでは自身のプロフィールへのリンクを含む", () => {
    expect(getNavItems({ userNo: 7, role: "general" })).toContainEqual({
      label: "プロフィール",
      href: "/users/7",
    });
  });
});
