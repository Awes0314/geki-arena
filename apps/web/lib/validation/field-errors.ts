import type { ZodError } from "zod";

/** ZodErrorを「フィールド名 -> 先頭のエラーメッセージ」に変換する。 */
export function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}
