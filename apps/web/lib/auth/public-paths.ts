/**
 * 未ログインでもアクセスできるパス。それ以外はログイン画面へリダイレクトする。
 * 受信ページは未ログイン時にページ側でログイン・再実行を案内するため公開とする。
 */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/password-reset",
  "/bookmarklet.js",
  "/api/courses/songs",
  "/score-submissions/receive",
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
