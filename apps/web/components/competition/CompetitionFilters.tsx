"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CheckboxCard } from "@/components/ui/CheckboxCard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LEVEL_OPTIONS } from "@/lib/competition/level";

const SEARCH_DEBOUNCE_MS = 400;
const FIELD_CLASS =
  "min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-accent";

type Status = "active" | "finished";

function LevelSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} aria-label={label} className={FIELD_CLASS} onChange={(event) => onChange(event.target.value)}>
      <option value="">指定なし</option>
      {LEVEL_OPTIONS.map((level) => (
        <option key={level} value={level}>
          Lv.{level}
        </option>
      ))}
    </select>
  );
}

/** 検索・フィルタ。変更はURLのクエリへ自動反映し、一覧のみを再取得する。 */
export function CompetitionFilters({ canFilterEligible }: { canFilterEligible: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [status, setStatus] = useState<Status>(params.get("status") === "finished" ? "finished" : "active");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [levelMin, setLevelMin] = useState(params.get("levelMin") ?? "");
  const [levelMax, setLevelMax] = useState(params.get("levelMax") ?? "");
  const [eligible, setEligible] = useState(params.get("eligible") === "1");
  const [detailOpen, setDetailOpen] = useState(levelMin !== "" || levelMax !== "" || eligible);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function apply(next: { status: Status; query: string; levelMin: string; levelMax: string; eligible: boolean }) {
    const search = new URLSearchParams();
    if (next.status === "finished") search.set("status", "finished");
    if (next.query.trim() !== "") search.set("q", next.query.trim());
    if (next.levelMin !== "") search.set("levelMin", next.levelMin);
    if (next.levelMax !== "") search.set("levelMax", next.levelMax);
    if (next.eligible) search.set("eligible", "1");
    const qs = search.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const current = { status, query, levelMin, levelMax, eligible };

  return (
    <form
      className="mb-4 flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        apply(current);
      }}
    >

      <div className="flex flex-row justify-between">
        <ToggleGroup
          type="single"
          value={status}
          aria-label="状態"
          className="self-start"
          onValueChange={(value) => {
            if (value !== "active" && value !== "finished") return;
            setStatus(value);
            apply({ ...current, status: value });
          }}
        >
          <ToggleGroupItem value="active">開催予定・開催中</ToggleGroupItem>
          <ToggleGroupItem value="finished">終了</ToggleGroupItem>
        </ToggleGroup>

        <input
          type="search"
          value={query}
          maxLength={100}
          placeholder="キーワードで検索"
          aria-label="キーワードで検索"
          className={FIELD_CLASS}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => apply({ ...current, query: value }), SEARCH_DEBOUNCE_MS);
          }}
        />
      </div>

      <details
        open={detailOpen}
        onToggle={(event) => setDetailOpen(event.currentTarget.open)}
        className="rounded-lg border border-border px-3 pt-1"
      >
        <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-medium">詳細フィルタ</summary>
        <div className="flex flex-col gap-4 pb-3">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm">使用されているレベル範囲</legend>
            <p className="text-xs text-muted">課題曲がすべて範囲内の大会のみ表示します。</p>
            <div className="flex flex-wrap items-center gap-2">
              <LevelSelect
                label="レベル下限"
                value={levelMin}
                onChange={(value) => {
                  setLevelMin(value);
                  apply({ ...current, levelMin: value });
                }}
              />
              <span>〜</span>
              <LevelSelect
                label="レベル上限"
                value={levelMax}
                onChange={(value) => {
                  setLevelMax(value);
                  apply({ ...current, levelMax: value });
                }}
              />
            </div>
          </fieldset>

          {canFilterEligible ? (
            <CheckboxCard
              title="自分が参加可能な大会のみ"
              description="Rating区分の条件を満たす大会に絞ります（終了済みを除く）。"
              checked={eligible}
              onCheckedChange={(value) => {
                setEligible(value);
                apply({ ...current, eligible: value });
              }}
            />
          ) : (
            <p className="text-xs text-muted">Rating区分を設定すると、参加可能な大会のみの絞り込みが使えます。</p>
          )}
        </div>
      </details>
    </form>
  );
}
