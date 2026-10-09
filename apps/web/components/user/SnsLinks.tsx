import { SNS_LABELS, isValidSnsLink, snsHref, type SnsLink } from "@/lib/validation/profile";

const ITEM_CLASS = "inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm";

function displayText(link: SnsLink): string {
  switch (link.type) {
    case "x":
      return `X (@${link.value})`;
    case "discord":
      return `Discord: ${link.value}`;
    case "other":
      return SNS_LABELS.other;
  }
}

/** 外部SNS一覧。リンク化できるものはSNSのプロフィールへ遷移し、Discordはユーザー名のテキスト表示とする。 */
export function SnsLinks({ links }: { links: SnsLink[] }) {
  const items = links.filter(isValidSnsLink);
  if (items.length === 0) return <p className="text-sm text-muted">未設定</p>;

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((link) => {
        const href = snsHref(link);
        return (
          <li key={link.type}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ITEM_CLASS} hover:bg-foreground/5`}
              >
                {displayText(link)}
              </a>
            ) : (
              <span className={`${ITEM_CLASS} select-all`}>{displayText(link)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
