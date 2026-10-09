import { render, screen } from "@testing-library/react";

import { Avatar } from "@/components/ui/Avatar";
import { TextInput } from "@/components/ui/Fields";
import { SnsLinks } from "@/components/user/SnsLinks";
import { UserDisplay } from "@/components/user/UserDisplay";

describe("TextInput", () => {
  it("ラベルと入力、エラーメッセージを関連付ける", () => {
    render(<TextInput label="表示名" name="displayName" error="必須です" />);
    const input = screen.getByLabelText("表示名");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("必須です");
  });
});

describe("Avatar", () => {
  it("画像未設定の場合は頭文字を表示する", () => {
    render(<Avatar src={null} name="テスト" />);
    expect(screen.getByRole("img", { name: "テストのアイコン" })).toHaveTextContent("テ");
  });
});

describe("UserDisplay", () => {
  it("プロフィールへのリンクとRating区分を表示する", () => {
    render(<UserDisplay userNo={12} displayName="alice" iconUrl={null} ratingLabel="Rank A" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/users/12");
    expect(screen.getByText("Rank A")).toBeInTheDocument();
  });
});

describe("SnsLinks", () => {
  it("https以外のリンクは表示しない", () => {
    render(
      <SnsLinks
        links={[
          { type: "x", value: "alice" },
          { type: "other", value: "javascript:alert(1)" },
        ]}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("リンクがない場合は未設定と表示する", () => {
    render(<SnsLinks links={[]} />);
    expect(screen.getByText("未設定")).toBeInTheDocument();
  });
});
