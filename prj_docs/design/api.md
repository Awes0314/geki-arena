# API Design

## API Principles
- 通常の画面操作（大会作成・参加、プロフィール編集等）は、Next.jsのServer Actionとして実装し、公開HTTP APIとしては提供しない。
- 以下の用途に限り、Route Handler（`app/api/**/route.ts`）として公開APIを設ける。
  - ブックマークレットからのスコア取得・提出（外部のブラウザコンテキストから`fetch`で呼び出されるため、Server Actionでは対応できない）。
  - 将来的な外部連携・Webhookが必要になった場合。
- APIは`prj_docs/domain/entities.md`のエンティティ・値オブジェクトを正とし、レスポンス構造を設計する。

## Route Structure
- `POST /api/score-submissions/bookmarklet`: ブックマークレットが取得したプレイ履歴データを受け取り、バリデーション・提出確認データの生成を行う。
- `POST /api/score-submissions`: ユーザーが確認画面で内容を確定した提出を永続化する。
- `POST /api/auth/password-reset`: リカバリーコードによるパスワード再設定（`authentication.md`参照）。
- その他の運営専用操作（`admin.md`参照）は、`/api/admin/**`配下に集約し、`role=admin`のみアクセス可能とする。

## Request / Response
- リクエスト/レスポンスはJSON形式とする。
- レスポンスは成功時`{ data: ... }`、失敗時`{ error: { code, message } }`の形式に統一する。
- スコア提出APIのリクエストボディは、`score.md`のScore Attributesに準拠したフィールド（楽曲名、難易度、プレイ日時、テクニカルスコア等）を含む配列（連続プレイの場合は複数曲分）とする。

## Validation
- 入力値は`score.md`の「Score Validation Details」に定めるルール（型・必須項目・0以上の整数等）に従い、サーバー側（Route Handler / Server Action）で検証する。
- バリデーションライブラリ（例: Zod等）を用いて、TypeScript型定義とスキーマ検証を一致させる方針とする（具体的なライブラリ選定は実装時に確定する）。
- バリデーション失敗時は、どの項目がどのように不正かをエラーレスポンスに含める。

## Authentication
- Route Handlerは、Cookieに保存されたSupabaseセッションを用いて認証状態を検証する。
- 未認証リクエストは401を返す。

## Authorization
- `role=admin`が必要なエンドポイント（`/api/admin/**`）は、認証済みかつ`role=admin`であることを確認した上で処理を行う。条件を満たさない場合は403を返す。
- 大会・1v1・コースに対する操作権限（主催者/参加者/運営）は、`domain/entities.md`の各エンティティの不変条件に従い検証する。

## Error Responses
- HTTPステータスコードとエラーコードの対応例:
  - 400: バリデーションエラー（`VALIDATION_ERROR`）
  - 401: 未認証（`UNAUTHENTICATED`）
  - 403: 権限不足（`FORBIDDEN`）
  - 404: 対象不存在（`NOT_FOUND`）
  - 409: 状態競合（例: 開催期間重複、重複提出等）（`CONFLICT`）
  - 500: サーバーエラー（`INTERNAL_ERROR`）
- ユーザーに提示するメッセージは一般化し、内部エラーの詳細（スタックトレース等）は含めない（`.claude/rules/coding_style.md`のエラー処理方針参照）。

## Rate Limiting
- 現時点ではレート制限機構は導入しない。
- ログイン試行・スコア提出等、不正利用が懸念される操作については、将来的な導入候補として記録しておく（`security.md`の「Rate Limiting」参照）。
