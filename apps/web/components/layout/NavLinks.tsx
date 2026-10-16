"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/lib/navigation";
import { MODE_TONE_CLASS } from "@/lib/mode-tone";

type NavLinksProps = {
  items: NavItem[];
  variant: "header" | "bottom";
};

/** 現在のパスに応じてアクティブ表示を切り替えるナビゲーション。 */
export function NavLinks({ items, variant }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <ul className={variant === "bottom" ? "flex w-full" : "flex items-center gap-1"}>
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const base =
          variant === "bottom"
            ? "flex min-h-14 flex-1 items-center justify-center text-xs font-medium"
            : "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-foreground/5";
        const color = item.tone ? MODE_TONE_CLASS[item.tone].text : active ? "text-accent" : "text-foreground";
        return (
          <li key={item.href} className={variant === "bottom" ? "flex-1" : undefined}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${base} ${color} ${active ? "underline underline-offset-4" : ""}`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
