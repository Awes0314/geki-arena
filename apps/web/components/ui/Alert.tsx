import type { ReactNode } from "react";

type AlertVariant = "error" | "success" | "info";

const STYLES: Record<AlertVariant, { className: string; icon: string }> = {
  error: { className: "border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-300", icon: "!" },
  success: { className: "border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-300", icon: "✓" },
  info: { className: "border-border bg-foreground/5", icon: "i" },
};

/** 色だけに依存しないよう、アイコンとテキストを併記する。 */
export function Alert({ variant = "info", children }: { variant?: AlertVariant; children: ReactNode }) {
  const style = STYLES[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${style.className}`}
    >
      <span aria-hidden="true" className="font-bold">
        {style.icon}
      </span>
      <div>{children}</div>
    </div>
  );
}
