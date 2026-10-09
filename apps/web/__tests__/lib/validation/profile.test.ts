import { isValidSnsLink, parseSnsLinks, profileSchema, snsHref, toSnsLinks } from "@/lib/validation/profile";

const valid = {
  displayName: "テスト",
  bio: "",
  snsX: "",
  snsDiscord: "",
  snsOther: "",
  ratingClassId: "",
  displayedBadgeId: "",
};

describe("profileSchema", () => {
  it("有効な入力を受け付ける", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it("表示名の前後の空白を除去し、空は拒否する", () => {
    expect(profileSchema.parse({ ...valid, displayName: "  a  " }).displayName).toBe("a");
    expect(profileSchema.safeParse({ ...valid, displayName: "   " }).success).toBe(false);
  });

  it("表示名は20文字まで", () => {
    expect(profileSchema.safeParse({ ...valid, displayName: "あ".repeat(20) }).success).toBe(true);
    expect(profileSchema.safeParse({ ...valid, displayName: "あ".repeat(21) }).success).toBe(false);
  });

  it("自己紹介は500文字まで", () => {
    expect(profileSchema.safeParse({ ...valid, bio: "a".repeat(500) }).success).toBe(true);
    expect(profileSchema.safeParse({ ...valid, bio: "a".repeat(501) }).success).toBe(false);
  });

  it.each(["http://example.com", "javascript:alert(1)", "not a url"])("その他のURLは https のみ許可する: %s", (url) => {
    expect(profileSchema.safeParse({ ...valid, snsOther: url }).success).toBe(false);
  });

  it("Xは@付きでも入力でき、@を除いて保存する", () => {
    expect(profileSchema.parse({ ...valid, snsX: "@alice_1" }).snsX).toBe("alice_1");
    expect(profileSchema.safeParse({ ...valid, snsX: "a-b" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, snsX: "a".repeat(16) }).success).toBe(false);
  });

  it("Discordはユーザー名（a-z,0-9,_,. の2〜32文字）のみ許可し、小文字に正規化する", () => {
    expect(profileSchema.parse({ ...valid, snsDiscord: "@Alice.dev_1" }).snsDiscord).toBe("alice.dev_1");
    expect(profileSchema.safeParse({ ...valid, snsDiscord: "a" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, snsDiscord: "a".repeat(33) }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, snsDiscord: "a..b" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, snsDiscord: "user#1234" }).success).toBe(false);
  });

  it("SNSのURLがhttpsなら許可する", () => {
    expect(profileSchema.safeParse({ ...valid, snsOther: "https://example.com/a" }).success).toBe(true);
  });

  it("Rating区分は数値文字列のみ、バッジはUUIDのみ許可する", () => {
    expect(profileSchema.safeParse({ ...valid, ratingClassId: "3" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...valid, ratingClassId: "abc" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, displayedBadgeId: "xyz" }).success).toBe(false);
    expect(
      profileSchema.safeParse({ ...valid, displayedBadgeId: "123e4567-e89b-42d3-a456-426614174000" }).success,
    ).toBe(true);
  });
});

describe("toSnsLinks", () => {
  it("未入力の項目を除外して保存形式に変換する", () => {
    expect(toSnsLinks({ snsX: "alice", snsDiscord: "", snsOther: "https://example.com" })).toEqual([
      { type: "x", value: "alice" },
      { type: "other", value: "https://example.com" },
    ]);
  });
});

describe("snsHref", () => {
  it("各SNSのプロフィールへのURLを生成する", () => {
    expect(snsHref({ type: "x", value: "alice" })).toBe("https://x.com/alice");
    expect(snsHref({ type: "discord", value: "alice_dev" })).toBeNull();
    expect(snsHref({ type: "other", value: "https://example.com" })).toBe("https://example.com");
  });

  it("不正な値はnullを返す", () => {
    expect(snsHref({ type: "x", value: "../evil" })).toBeNull();
    expect(isValidSnsLink({ type: "discord", value: "alice_dev" })).toBe(true);
    expect(isValidSnsLink({ type: "discord", value: "a" })).toBe(false);
    expect(snsHref({ type: "discord", value: "abc" })).toBeNull();
    expect(snsHref({ type: "other", value: "javascript:alert(1)" })).toBeNull();
  });
});

describe("parseSnsLinks", () => {
  it("不正な要素を除外する", () => {
    expect(
      parseSnsLinks([{ type: "x", value: "alice" }, { type: "foo", value: "a" }, { type: "x" }, null]),
    ).toEqual([{ type: "x", value: "alice" }]);
  });

  it("配列以外は空配列にする", () => {
    expect(parseSnsLinks({})).toEqual([]);
    expect(parseSnsLinks(null)).toEqual([]);
  });
});
