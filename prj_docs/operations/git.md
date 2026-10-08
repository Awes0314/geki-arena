# Git Workflow

## Branches
- `main`: 本番環境（Production）にデプロイされる安定版ブランチ。
- `develop`: 開発中の変更を統合するブランチ。独自のデプロイ環境は持たず、Vercel Preview DeploymentはDevelopment用Supabaseプロジェクトに接続する。
- `feature/*`: 新機能・修正ごとの作業ブランチ。`develop`からブランチし、`develop`へのPull Requestでマージする。
- ブランチ運用の基本方針は`.claude/rules/git.md`を正とする。

## Branch Naming
- `feature/<概要>`（例: `feature/competition-creation`）
- `fix/<概要>`: 既存機能の不具合修正
- `chore/<概要>`: ドキュメント更新等、機能に直接影響しない変更

## Commit Convention
- Conventional Commits（`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`等）に従う（`.claude/rules/git.md`参照）。
- 1コミットは意味のある単位に留め、無関係な変更を混在させない。

## Pull Requests
- `feature/*` → `develop`、`develop` → `main`のいずれもPull Request経由でマージする。
- レビューを経てからマージする（`.claude/rules/git.md`参照）。
- PRの単位は小さく保つ。

## Merge Strategy
- Squash Mergeを基本とする（`develop`上のコミット履歴を整理するため）。
- `develop` → `main`のマージも、リリース内容が分かるようSquash Merge、またはリリースコミットとしてまとめる。

## Release Flow
1. `feature/*`ブランチで開発し、`develop`へPull Requestでマージする。
2. `develop`上で動作確認（Development環境）を行う。
3. `develop` → `main`へPull Requestを作成し、レビュー後マージする。
4. `main`へのマージを契機に、Vercelが自動的にProduction Deploymentを実行する（`deployment.md`参照）。
5. 必要なデータベースマイグレーションは、マージ前後の適切なタイミングで開発者が手動適用する（`deployment.md`の「Database Migration」参照）。

## Hotfix
- 本番環境で緊急の修正が必要な場合、`main`から`fix/<概要>`ブランチを作成し、修正後`main`へPull Requestでマージする。
- マージ後、`develop`にも同内容を反映し、ブランチ間の差分が生じないようにする。

## Tags / Releases
- `main`へのマージ（リリース）ごとに、バージョンタグ（例: `v1.2.0`）を付与する。
- バージョニング規則（SemVer等）の詳細は、運用開始後に必要に応じて定める。