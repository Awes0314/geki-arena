"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AdminNavItem } from "@/lib/admin/navigation";

/** 運営ページ共通のサブナビゲーション。 */
export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="運営メニュー" className="border-b border-border bg-surface">
      <ul className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center px-3 text-sm font-medium hover:bg-foreground/5 ${
                  active ? "text-accent underline underline-offset-4" : "text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
