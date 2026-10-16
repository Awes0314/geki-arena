import { render, screen } from "@testing-library/react";

import { CourseBadge } from "@/components/user/CourseBadge";
import { BADGE_CHAPTERS, BADGE_STYLES, isBadgeChapter } from "@/lib/course-badge";

describe("CourseBadge", () => {
  it("全チャプターにスタイルが定義されている", () => {
    for (const badgeChapter of BADGE_CHAPTERS) {
      expect(BADGE_STYLES[badgeChapter].glyph).not.toBe("");
    }
  });

  it("特殊チャプターはギリシャ文字を表示する", () => {
    render(<CourseBadge badgeChapter="beta" courseName="特殊コース" />);
    expect(screen.getByRole("img", { name: "コースバッジ: 特殊コース" })).toHaveTextContent("β");
  });

  it("isBadgeChapterは未知の値を拒否する", () => {
    expect(isBadgeChapter("9")).toBe(true);
    expect(isBadgeChapter("10")).toBe(false);
  });
});
