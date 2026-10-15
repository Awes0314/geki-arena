import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export type FormFieldProps = {
  label: string;
  hint?: string;
  /** 入力の制限（項目名の下に列挙する） */
  limits?: string[];
  error?: string;
  required?: boolean;
  /** id・aria属性を受け取れる単一の入力要素 */
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
};

/** ラベル・ヒント・エラーメッセージを入力要素に関連付ける共通ラッパー。 */
export function FormField({ label, hint, limits, error, required, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span aria-hidden="true" className="ml-1 text-red-600">*</span>}
      </label>
      {limits && limits.length > 0 && (
        <ul className="list-inside list-disc text-xs text-muted">
          {limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      )}
      {isValidElement(children)
        ? cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
        : (children as ReactNode)}
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClassName =
  "min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-foreground " +
  "placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent " +
  "aria-[invalid=true]:border-red-600 disabled:opacity-50";
