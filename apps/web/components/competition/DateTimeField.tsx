"use client";

import { useState } from "react";

import { inputClassName } from "@/components/ui/FormField";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 6 }, (_, i) => String(i * 10).padStart(2, "0"));

type DateTimeFieldProps = {
  label: string;
  name: string;
  /** YYYY-MM-DDTHH:mm（JST） */
  defaultValue: string;
  limits?: string[];
  error?: string;
  required?: boolean;
};

/** 10分刻みでのみ選択できる日時入力。値はnameでYYYY-MM-DDTHH:mmとして送信する。 */
export function DateTimeField({ label, name, defaultValue, limits, error, required }: DateTimeFieldProps) {
  const [initialDate = "", initialTime = "00:00"] = defaultValue.split("T");
  const [date, setDate] = useState(initialDate);
  const [hour, setHour] = useState(initialTime.slice(0, 2));
  const [minute, setMinute] = useState(initialTime.slice(3, 5));

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium">
        {label}
        {required && <span aria-hidden="true" className="ml-1 text-red-600">*</span>}
      </legend>
      {limits && limits.length > 0 && (
        <ul className="list-inside list-disc text-xs text-muted">
          {limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      )}
      <input type="hidden" name={name} value={date ? `${date}T${hour}:${minute}` : ""} />
      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label={`${label}（日付）`}
          className={`${inputClassName} min-w-0 flex-1`}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <select
          aria-label={`${label}（時）`}
          className={`${inputClassName} max-w-18 shrink-0`}
          value={hour}
          onChange={(event) => setHour(event.target.value)}
        >
          {HOURS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <span aria-hidden="true">:</span>
        <select
          aria-label={`${label}（分）`}
          className={`${inputClassName} max-w-18 shrink-0`}
          value={minute}
          onChange={(event) => setMinute(event.target.value)}
        >
          {MINUTES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
