/** Server Actionの統一的な戻り値。api.mdのエラーコード体系に合わせる。 */
export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ActionErrorCode;
        message: string;
        /** フィールド名 -> エラーメッセージ */
        fieldErrors?: Record<string, string>;
      };
    };

/** useActionState用のフォーム状態。入力値を返し、送信後のフォームリセットで入力が消えないようにする。 */
export type FormState<T = undefined> = { result: ActionResult<T>; values: Record<string, string> } | null;

/** FormDataの文字列項目のみを取り出す（ファイルは除外）。 */
export function formDataToValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, error: { code, message, fieldErrors } };
}

/** 想定外エラーはログにのみ詳細を残し、ユーザーには一般化したメッセージを返す。 */
export function failInternal(context: string, cause: unknown): ActionResult<never> {
  console.error(`[${context}]`, cause instanceof Error ? cause.message : cause);
  return fail("INTERNAL_ERROR", "処理に失敗しました。時間をおいて再度お試しください。");
}
