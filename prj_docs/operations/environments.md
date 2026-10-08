# Environments

## Environment Overview
- Development（開発）とProduction（本番）の2環境を運用する。
- Staging環境は、Supabase無料枠の制約（プロジェクト数上限2）およびプロジェクト規模を踏まえ、当面構築しない（「Staging」参照）。

## Development
- Local: 開発者のローカル環境（`next dev`）。
- Branch: `main`以外の全てのブランチ（`develop`, `feature/*`等）およびPull RequestによるVercel Preview Deployment。
- Supabase: 開発用プロジェクト（1つ）。ローカル開発・Vercel Preview Deploymentの両方からこのプロジェクトに接続する。
- Vercel: Preview Deployment（ブランチ/PRごとに自動生成される一時URL）。

## Staging
- 当面構築しない。将来必要になった場合は、Supabase有料プランへの移行とあわせて、`develop`ブランチに対応するStaging環境の構築を検討する。

## Production
- Branch: `main`
- Supabase: 本番用プロジェクト（Development用とは別プロジェクト）。
- Vercel: Production Deployment（`main`ブランチへのマージを契機に自動デプロイ）。

## Environment Variables
| 変数名 | 用途 | Development | Production |
|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | SupabaseプロジェクトURL（クライアント公開可） | 開発用プロジェクトのURL | 本番用プロジェクトのURL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase匿名キー（クライアント公開可、RLSにより保護） | 開発用 | 本番用 |
| SUPABASE_SERVICE_ROLE_KEY | Service Roleキー（サーバー側限定、`design/security.md`参照） | 開発用 | 本番用 |
| SUPABASE_AUTH_INTERNAL_EMAIL_DOMAIN | 登録時に生成する擬似メールアドレス用ドメイン（`design/authentication.md`参照） | 例: dev.geki-arena.internal | 例: geki-arena.internal |
- 具体的な値はVercelの環境変数機能で環境ごとに設定し、リポジトリにはコミットしない（`.claude/rules/security.md`参照）。

## Environment Differences
| 項目 | Development | Production |
|---|---|---|
| Supabaseプロジェクト | 開発用（別プロジェクト） | 本番用（別プロジェクト） |
| デプロイ契機 | Pull Request作成・更新 | `main`へのマージ |
| URL | Vercel Preview URL（一時） | 本番ドメイン |
| データ | テスト用データ（随時リセット可） | 実データ（保持方針は`design/database.md`参照） |