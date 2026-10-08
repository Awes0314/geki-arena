# Security Design

## Threat Model
主な脅威と対応方針を示す（`.claude/rules/security.md`準拠）。
- 不正ログイン（総当たり等）: Supabase Authのパスワード検証に加え、将来的なレート制限導入を検討（「Rate Limiting」参照）。
- スコア不正提出: `score.md`のバリデーションルールに基づくサーバー側検証、運営によるスコア削除機能（`admin.md`）。
- なりすまし・権限昇格: RLSおよびアプリケーション層の認可チェックの二重防御。
- 個人情報漏えい: そもそも個人情報（メールアドレス等）を収集しない方針（`overview.md`）により、情報資産自体を最小化する。

## Authentication
- Supabase Authによるパスワード検証・ハッシュ化（`authentication.md`参照）。当システム側ではパスワード平文・ハッシュを保持しない。
- パスワード再設定用リカバリーコードは、平文を保存せずハッシュ化して保持する（`authentication.md`参照）。

## Authorization
- `public.users.role`（general/admin）に基づくアプリケーション層の認可チェックと、Postgres RLSによるデータアクセス制御の二層で保護する（`database.md`の「RLS」参照）。
- 運営専用機能（`admin.md`）は、Service Roleクライアントを用いた専用の実行経路に限定し、一般ユーザーの実行経路とは分離する。

## Input Validation
- すべての外部入力（フォーム送信、ブックマークレット経由のスコアデータ等）はサーバー側で検証する（`api.md`の「Validation」参照）。
- クライアント側のバリデーションは利便性向上のためのものであり、信頼しない（サーバー側検証を必須とする）。

## CSRF / XSS
- Server Actionは、Next.jsの仕組みによりCSRF対策（Originチェック）が組み込まれている前提で利用する。
- Route Handlerを独自に設ける場合は、Origin/Refererの検証を行う。
- ユーザー入力（自己紹介、大会説明等）を画面に表示する箇所は、Reactの標準的なエスケープに任せ、`dangerouslySetInnerHTML`等の使用は避ける。SVGアセット（コースバッジ）は運営が管理するアセットのみを許可し、ユーザー入力由来のSVGを直接レンダリングしない。

## Database Security
- RLSをすべてのテーブルで有効化し、Service Roleキーはサーバー側（Route Handler / Server Action / 運営機能）でのみ使用し、クライアントに露出させない。
- 接続情報・APIキーは環境変数で管理し、リポジトリにコミットしない（`.claude/rules/security.md`参照）。

## Rate Limiting
- 現時点では未導入。ログイン試行・スコア提出・通報等、乱用が懸念される操作について、将来的に導入を検討する事項として記録する。

## Abuse Prevention
- ユーザーからの通報機能（`user.md`）と、運営によるアカウント停止・スコア削除・参加取消（`admin.md`）を基本的な不正利用対応手段とする。
- 大会・1v1の削除条件、スコアの更新条件（既存記録より高い場合のみ反映）など、ドメインの不変条件（`domain/entities.md`）自体が一定の不正防止策として機能する。

## Secrets
- Supabase接続情報（URL、anonキー、Service Roleキー）、Supabase Authの管理操作に使う鍵は環境変数で管理する（`operations/environments.md`参照）。
- Service Roleキーはサーバー側コードのみで使用し、クライアントバンドルに含めない。

## Logging / Auditing
- 運営による操作（アカウント停止、スコア削除、参加取消等）は`operation_logs`テーブルに記録する（`database.md`参照）。
- ログには個人情報・認証情報（パスワード、リカバリーコード等）を含めない（`.claude/rules/security.md`参照）。
