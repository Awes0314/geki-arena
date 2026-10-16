import { BADGE_STYLES, type BadgeChapter } from "@/lib/course-badge";

type CourseBadgeProps = {
  badgeChapter: BadgeChapter;
  courseName: string;
  size?: number;
};

/** 六角形＋シェブロン＋チャプター文字のコースバッジ。アプリ側で生成するためユーザー入力は描画しない。 */
export function CourseBadge({ badgeChapter, courseName, size = 48 }: CourseBadgeProps) {
  const { glyph, accent, frame } = BADGE_STYLES[badgeChapter];
  const label = courseName ? `コースバッジ: ${courseName}` : "コースバッジ";

  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 100 100" className="shrink-0">
      <polygon
        points="50,4 90,27 90,73 50,96 10,73 10,27"
        fill="#0b0f14"
        stroke={frame}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <polygon points="22,31 50,15 78,31 78,40 50,24 22,40" fill={accent} />
      <polygon points="22,69 50,85 78,69 78,60 50,76 22,60" fill={accent} />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="34"
        fontWeight="800"
        fill="#ffffff"
        fontFamily="system-ui, sans-serif"
      >
        {glyph}
      </text>
    </svg>
  );
}
