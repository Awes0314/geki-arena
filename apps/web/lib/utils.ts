import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwindのクラスを条件付きで結合し、競合を解消する（shadcn/ui標準）。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
