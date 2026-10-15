"use client";

import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type CheckboxCardProps = {
  title: string;
  description?: ReactNode;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/** 枠付きでラベル全体をクリックできるチェックボックス。チェック時は枠と背景をアクセント色にする。 */
export function CheckboxCard({ title, description, name, checked, defaultChecked, onCheckedChange }: CheckboxCardProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-foreground/5",
        "has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent/10",
      )}
    >
      <Checkbox
        className="mt-0.5"
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(next) => onCheckedChange?.(next === true)}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        {description && <span className="text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}
