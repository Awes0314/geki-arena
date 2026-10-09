# Authentication Design

## Authentication Provider
- Supabase Authを認証基盤として使用する。
- `authentication.md`（requirements）の方針により、メールアドレスは収集しない。そのため、Supabase Authのユーザーレコード作成時には、サーバー側でシステム内部用の疑似メールアドレス（`{userId}@{SUPABASE_AUTH_INTERNAL_EMAIL_DOMAIN}`、例: `alice@geki-arena.internal`）を生成し登録する。ドメインは環境変数で環境ごとに設定する（`operations/environments.md`参照）。このメールアドレスはユーザーには通知・表示せず、ログインにも使用しない（ログインは常にuserId+passwordで行う）。
- パスワードの保存・検証（ハッシュ化含む）はSupabase Authに委譲し、当システム側ではパスワードハッシュを保持しない。

## Registration Flow
1. ユーザーがuserId・password（確認入力あり）を入力する。userIdは前後の空白を除去し小文字に正規化した上で、形式（`a-z0-9_`の3〜20文字）とパスワード長（8〜128文字）をサーバー側で検証する。
2. サーバー側（Server Action）で、userIdの一意性を確認する（`public.users.user_id`のUNIQUE制約、`database.md`参照）。
3. userIdから内部疑似メールアドレスを生成し、Supabase Auth（Admin API、Service Role）でユーザーを作成する。
4. 発行されたSupabase AuthのユーザーID（`auth.users.id`）を主キーとして、`public.users`にプロフィール行（user_no自動採番（10000〜99999のランダムかつ一意な値）、user_id、display_name（初期値はuser_id）、status='active'、role='general'等）を作成する。プロフィール行の作成に失敗した場合は、作成済みのAuthユーザーを削除する。
5. パスワード再設定用のリカバリーコードを生成し、SHA-256でハッシュ化して`recovery_code_hash`に保存する。リカバリーコードの平文はこの時点で1度だけユーザーに提示し、以後システム側では再表示しない。
6. 登録したuserId・passwordで自動ログインする（セッションCookieを発行する）。
7. リカバリーコードを表示し、ユーザーが保存を確認した後に、表示名・アイコン画像・Rating区分の設定画面（`/profile/edit?onboarding=1`、スキップ可能、`user.md`参照）へ進める。

### Recovery Code
- 形式: 混同しやすい文字（`0`/`O`、`1`/`I`/`L`）を除いた英大文字・数字の4文字を1グループとし、現在は1グループ（4文字）。暗号論的乱数で生成する。グループ数は定数で変更でき、複数グループの場合はハイフンで連結する。
- 照合時は大文字小文字・ハイフン・空白の違いを無視する。
- ハッシュ化はSHA-256とし、平文は保存しない。

## Login Flow
1. ユーザーがuserId・passwordを入力する（userIdは小文字に正規化する）。
2. サーバー側でuserIdから内部疑似メールアドレスを解決する。
3. Supabase Authに対して疑似メールアドレス+passwordで認証を行う。
4. 認証成功時、`public.users`の`status`を確認する。`suspended`の場合はログインを拒否する（`authentication.md`参照）。
5. 認証成功かつstatus=activeの場合、Supabaseが発行するセッション（アクセストークン/リフレッシュトークン）を`@supabase/ssr`経由でhttpOnly Cookieに保存する。

## Email Verification
- メールアドレスを収集しないため、メール経由の本人確認（verification）は実施しない。

## Password Reset
- メール経由のパスワードリセットは行わない（メールアドレスを収集しないため）。
- 登録時に発行する「リカバリーコード」を用いたリセット方式とする。
  1. ユーザーがuserId・リカバリーコード・新パスワード（確認入力あり）を入力する。
  2. サーバー側（Server Action）で`recovery_code_hash`と照合する（タイミング攻撃を避けるため定数時間比較を用いる）。ユーザーが存在しない・status!=activeの場合も含め、失敗理由は区別せず同一のエラーメッセージを返す。
  3. 一致した場合、新しいリカバリーコードを発行して`recovery_code_hash`を更新した上で、Supabase Auth（Admin API、Service Role）でパスワードを更新する。パスワード更新に失敗した場合は`recovery_code_hash`を元の値に戻す。
  4. 新しいリカバリーコードを1度だけ提示する（コードの使い回しを防ぐため、以前のコードは無効となる）。
- 現時点では再設定の試行回数制限を設けていない（`security.md`の「Rate Limiting」参照）。
- 再設定後も既存のセッションは失効させない。
- リカバリーコードを紛失した場合の救済手段は提供しない（運営への問い合わせ対応は`admin.md`のユーザー管理機能の範囲外とし、必要であれば別途運用ルールを定める）。

## OAuth
- 外部SNSとの連携は行わない方針（`overview.md`のNon-Goals参照）のため、OAuthによるログインは提供しない。

## Session Management
- Supabase Authが管理するセッション（アクセストークン/リフレッシュトークン）を利用する。
- `prj_docs/domain/state-transitions.md`の`Session`は、Supabase Auth内部のセッション管理（リフレッシュトークンの発行・失効管理）に対応するものとし、当システム独自のセッションテーブルは設けない。
- ログアウト操作時は、Supabase Authのサインアウト処理を呼び出し、Cookie上のセッションを失効させる。
- セッションの有効期限は、要件（再ログイン頻度を減らすため長めに設定する、`authentication.md`参照）に基づき、Supabaseのリフレッシュトークン有効期限設定で長めの値を設定する（具体的な期間は運用時に確定する）。
- アカウント停止（`status=suspended`）時は、既存セッションを即時に無効化できるよう、Supabase Admin APIでユーザーの全セッションを失効させる。

## Authorization
- 未ログインのユーザーが`/login`・`/register`・`/password-reset`以外へアクセスした場合は、Next.jsのproxy（`proxy.ts`）でセッションを検証し、`/login`へリダイレクトする。
- `public.users.role`（`general` / `admin`）により、画面・APIレベルでの認可判定を行う。
- 運営機能（`admin.md`参照）へのアクセスは、Server Component / Server Action / Route Handlerの入口で`role=admin`を確認した上で許可する。

## RLS Integration
- 通常のデータアクセスは、ログインユーザーのJWT（`auth.uid()`）を伴うSupabaseクライアントを使用し、Postgresの行単位セキュリティ（RLS）で保護する。
- RLSポリシーの詳細は`./database.md`の「RLS」を参照。
- 運営機能等でRLSをバイパスする必要がある場合のみ、Service Roleクライアントを使用する（`architecture.md`の設計原則参照）。
