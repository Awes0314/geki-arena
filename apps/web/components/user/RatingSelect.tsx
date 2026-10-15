"use client";

import { useId, useState } from "react";

import { RatingBadge } from "@/components/user/RatingBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RatingOption = { id: number; label: string; tier: string };

type RatingSelectProps = {
  label: string;
  name: string;
  options: RatingOption[];
  /** 未選択時の表示（例: 未設定、指定なし） */
  emptyLabel: string;
  defaultValue?: string;
  limits?: string[];
  hint?: string;
  error?: string;
};

/** Rating区分を、バッジ表示で選択する共通セレクト。値はnameの隠し項目で送信する（未選択は空文字）。 */
export function RatingSelect({ label, name, options, emptyLabel, defaultValue = "", limits, hint, error }: RatingSelectProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const NONE = "none";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {limits && limits.length > 0 && (
        <ul className="list-inside list-disc text-xs text-muted">
          {limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      )}
      <input type="hidden" name={name} value={value} />
      <Select value={value === "" ? NONE : value} onValueChange={(next) => setValue(next === NONE ? "" : next)}>
        <SelectTrigger id={id} aria-invalid={error ? true : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted">{emptyLabel}</span>
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              <RatingBadge label={option.label} tier={option.tier} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
