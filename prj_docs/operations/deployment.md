# Deployment

## Deployment Architecture
- VercelのGit連携によるデプロイを基本とする。GitHubリポジトリへのpush/PR作成を契機に、Vercelが自動的にビルド・デプロイを行う。
- データベース（Supabaseマイグレーション）は、Vercelのデプロイパイプラインとは独立して、開発者が手動で適用する（「Database Migration」参照）。

## Development Deployment
- `main`以外のブランチへのpush、またはPull Requestの作成・更新を契機に、VercelがPreview Deploymentを自動作成する。
- 接続先はDevelopment用Supabaseプロジェクトとする。

## Staging Deployment
- 当面構築しない（`environments.md`の「Staging」参照）。

## Production Deployment
- `main`ブランチへのマージを契機に、VercelがProduction Deploymentを自動実行する。
- 接続先はProduction用Supabaseプロジェクトとする。
- `main`へのマージは`.claude/rules/git.md`の方針により、直接pushではなくPull Request経由のマージとする。

## Deployment Trigger
- Preview: 任意のブランチへのpush / PRの作成・更新。
- Production: `main`ブランチへのマージ。

## Database Migration
- Supabase CLIで管理するマイグレーションファイル（`design/database.md`の「Migration Policy」参照）を、開発者が手元から対象環境（Development→Productionの順）に手動適用する。
- 破壊的変更（カラム削除・型変更等）を伴うマイグレーションは、適用前に内容をレビューし、必要に応じてユーザー（プロジェクト関係者）に確認を取る（`.claude/rules/git.md`の「大規模な履歴変更前に確認すること」に準じる方針）。
- アプリケーションコードのデプロイより先にマイグレーションを適用し、スキーマ変更とコードの非互換な期間を最小化する。

## Rollback
- アプリケーション: Vercelの「Instant Rollback」機能により、直前のデプロイに即座に戻す。
- データベース: マイグレーションのロールバックは自動化せず、問題発生時は打ち消し用マイグレーション（ロールフォワード）を作成して対応することを基本とする。破壊的変更を伴うマイグレーションでは、事前にバックアップ（Supabaseのポイントインタイムリカバリ等）の確認を行う。

## Release Checklist
- lint・型チェック・テストが全て成功していること（`.claude/rules/testing.md`参照）。
- 対象のマイグレーションがDevelopment環境で適用・検証済みであること。
- 破壊的変更を伴う場合、影響範囲と対応方針を確認済みであること。
- Pull Requestのレビューが完了していること（`.claude/rules/git.md`参照）。