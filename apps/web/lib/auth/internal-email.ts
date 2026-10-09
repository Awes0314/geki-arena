/** userIdから内部用の疑似メールアドレスを生成する（authentication.md参照）。 */
export function userIdToInternalEmail(userId: string): string {
  const domain = process.env.SUPABASE_AUTH_INTERNAL_EMAIL_DOMAIN;
  if (!domain) {
    throw new Error("SUPABASE_AUTH_INTERNAL_EMAIL_DOMAIN is not set");
  }
  return `${userId}@${domain}`;
}
