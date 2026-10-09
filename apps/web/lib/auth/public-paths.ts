/** 未ログインでもアクセスできるパス。それ以外はログイン画面へリダイレクトする。 */
const PUBLIC_PATHS = ["/login", "/register", "/password-reset"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
