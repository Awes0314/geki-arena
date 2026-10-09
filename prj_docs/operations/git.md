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

## Daily Workflow（作業ブランチ → develop）
開発者本人が行う手順。GitHub CLI（`gh`）は導入済みで、PR作成は`gh pr create`で行える。マージはGitHub Web画面で開発者が手動で行う。

1. 最新化とブランチ作成
   ```powershell
   git switch develop
   git pull
   git switch -c feature/<概要>
   ```
2. 実装・コミット（Conventional Commits）
   ```powershell
   git add <対象>
   git commit -m "feat: ○○を追加"
   ```
3. push前にローカル検証（`apps/web`で実行）
   ```powershell
   npm run lint; npm run typecheck; npm test --if-present
   ```
4. push
   ```powershell
   git push -u origin feature/<概要>
   ```
   push後、`gh pr create --base develop`（`--body-file`でテンプレートに沿った本文を指定）、VS CodeのGitHub Pull Requests拡張、またはGitHubのリポジトリ画面の「Compare & pull request」からPRを作成する。
5. PR作成: base=`develop`、compare=作業ブランチ。`.github/pull_request_template.md`を記入する。
6. CI（lint / type check / test）の成功を確認し、「Squash and merge」でマージする。作業ブランチはマージ後に削除する（自動削除未設定の場合は「Delete branch」を押す）。
7. ローカルの後始末
   ```powershell
   git switch develop
   git pull
   git fetch --prune
   git branch -d feature/<概要>
   ```

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

## Branch Protection
GitHubのBranch Protection（Ruleset）で`main`・`develop`に以下を設定する。
- 直接pushの禁止（Pull Request必須）。force push・ブランチ削除の禁止。
- マージ方法はSquash Mergeのみ許可。マージ後、作業ブランチは自動削除する。
- 必須ステータスチェック: CI（下記）の成功。
- 必須承認数: 0（開発者が1名の間の暫定。複数名体制になった時点で1以上に見直す）。
- 既定ブランチは`develop`とする。

## CI
- GitHub Actionsで、`develop`・`main`宛のPull Requestに対し、`.claude/rules/testing.md`に従い以下を実行する。
  - lint
  - type check
  - test
- パッケージマネージャはnpmを使用する。
- 実行対象は`apps/web`とする。
- `lint`・`typecheck`は`package.json`のscriptsとして定義済み。`test`は未定義のため現状は`--if-present`でスキップされる（Jest導入時にscriptsへ追加する）。

## Issue / PR Templates
- PRテンプレート: `.github/pull_request_template.md`
- Issueテンプレート: `.github/ISSUE_TEMPLATE/`（機能要望・バグ報告）

## Hotfix
- 本番環境で緊急の修正が必要な場合、`main`から`fix/<概要>`ブランチを作成し、修正後`main`へPull Requestでマージする。
- マージ後、`develop`にも同内容を反映し、ブランチ間の差分が生じないようにする。

## Tags / Releases
- `main`へのマージ（リリース）ごとに、バージョンタグ（例: `v1.2.0`）を付与する。
- バージョニング規則（SemVer等）の詳細は、運用開始後に必要に応じて定める。