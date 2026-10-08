# Authentication Design

## Authentication Provider
- Supabase Authを認証基盤として使用する。
- `authentication.md`（requirements）の方針により、メールアドレスは収集しない。そのため、Supabase Authのユーザーレコード作成時には、サーバー側でシステム内部用の疑似メールアドレス（例: `{userId}@geki-arena.internal`）を生成し登録する。このメールアドレスはユーザーには通知・表示せず、ログインにも使用しない（ログインは常にuserId+passwordで行う）。
- パスワードの保存・検証（ハッシュ化含む）はSupabase Authに委譲し、当システム側ではパスワードハッシュを保持しない。

## Registration Flow
1. ユーザーがuserId・passwordを入力する。
2. サーバー側（Server Action）で、userIdの一意性を確認する（`public.users.user_id`のUNIQUE制約、`database.md`参照）。
3. userIdから内部疑似メールアドレスを生成し、Supabase Auth（Admin API、Service Role）でユーザーを作成する。
4. 発行されたSupabase AuthのユーザーID（`auth.users.id`）を主キーとして、`public.users`にプロフィール行（user_no自動採番、user_id、status='active'、role='general'等）を作成する。
5. パスワード再設定用のリカバリーコードを生成し、ハッシュ化して`recovery_code_hash`に保存する。リカバリーコードの平文はこの時点で1度だけユーザーに提示し、以後システム側では再表示しない。
6. 表示名・アイコン画像の設定を促す（スキップ可能、`user.md`参照）。

## Login Flow
1. ユーザーがuserId・passwordを入力する。
2. サーバー側でuserIdから内部疑似メールアドレスを解決する。
3. Supabase Authに対して疑似メールアドレス+passwordで認証を行う。
4. 認証成功時、`public.users`の`status`を確認する。`suspended`の場合はログインを拒否する（`authentication.md`参照）。
5. 認証成功かつstatus=activeの場合、Supabaseが発行するセッション（アクセストークン/リフレッシュトークン）を`@supabase/ssr`経由でhttpOnly Cookieに保存する。

## Email Verification
- メールアドレスを収集しないため、メール経由の本人確認（verification）は実施しない。

## Password Reset
- メール経由のパスワードリセットは行わない（メールアドレスを収集しないため）。
- 登録時に発行する「リカバリーコード」を用いたリセット方式とする。
  1. ユーザーがuserId・リカバリーコード・新パスワードを入力する。
  2. サーバー側で`recovery_code_hash`と照合する。
  3. 一致した場合、Supabase Auth（Admin API、Service Role）でパスワードを更新する。
  4. パスワード更新と同時に、新しいリカバリーコードを再発行し提示する（コードの使い回しを防ぐため）。
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
- `public.users.role`（`general` / `admin`）により、画面・APIレベルでの認可判定を行う。
- 運営機能（`admin.md`参照）へのアクセスは、Server Component / Server Action / Route Handlerの入口で`role=admin`を確認した上で許可する。

## RLS Integration
- 通常のデータアクセスは、ログインユーザーのJWT（`auth.uid()`）を伴うSupabaseクライアントを使用し、Postgresの行単位セキュリティ（RLS）で保護する。
- RLSポリシーの詳細は`./database.md`の「RLS」を参照。
- 運営機能等でRLSをバイパスする必要がある場合のみ、Service Roleクライアントを使用する（`architecture.md`の設計原則参照）。
