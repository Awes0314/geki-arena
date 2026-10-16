"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 400;

/** キーワード検索。入力はURLのqへ自動反映し、タブ(tab)は維持する。 */
export function MatchSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function apply(value: string) {
    const search = new URLSearchParams(params.toString());
    if (value.trim() === "") search.delete("q");
    else search.set("q", value.trim());
    const qs = search.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <input
      type="search"
      value={query}
      maxLength={100}
      placeholder="キーワードで検索"
      aria-label="キーワードで検索"
      className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-accent"
      onChange={(event) => {
        const value = event.target.value;
        setQuery(value);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => apply(value), SEARCH_DEBOUNCE_MS);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.preventDefault();
      }}
    />
  );
}
