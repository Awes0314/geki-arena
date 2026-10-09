import Image from "next/image";

const SIZES = { sm: 32, md: 48, lg: 96 } as const;
export type AvatarSize = keyof typeof SIZES;

type AvatarProps = {
  src: string | null;
  name: string;
  size?: AvatarSize;
};

/** アイコン画像。未設定の場合は表示名の頭文字を表示する。 */
export function Avatar({ src, name, size = "md" }: AvatarProps) {
  const px = SIZES[size];
  const style = { width: px, height: px };

  if (src) {
    return (
      <Image
        src={src}
        alt={`${name}のアイコン`}
        width={px}
        height={px}
        unoptimized
        className="shrink-0 rounded-full border border-border object-cover"
        style={style}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={`${name}のアイコン`}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent"
      style={{ ...style, fontSize: px / 2.5 }}
    >
      {Array.from(name)[0] ?? "?"}
    </span>
  );
}
