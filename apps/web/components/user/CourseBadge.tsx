import Image from "next/image";

type CourseBadgeProps = {
  svgUrl: string;
  courseName: string;
  size?: number;
};

/** 運営管理のSVGアセットを<img>として表示する（スクリプトは実行されない）。 */
export function CourseBadge({ svgUrl, courseName, size = 48 }: CourseBadgeProps) {
  return (
    <Image
      src={svgUrl}
      alt={courseName ? `コースバッジ: ${courseName}` : "コースバッジ"}
      width={size}
      height={size}
      unoptimized
      className="shrink-0"
    />
  );
}
