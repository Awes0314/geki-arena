# Geki Arena

SEGA運営のアーケード音楽ゲーム「オンゲキ」の非公式対戦プラットフォームWebアプリ。

## Tech Stack
- Next.js / TypeScript（`apps/web`）
- PostgreSQL（Supabase）
- Vercel
- Jest
- Tailwind CSS / Framer Motion

## Documents
仕様は [`prj_docs`](./prj_docs) を正とする。

- [requirements](./prj_docs/requirements/README.md): 要求仕様
- [domain](./prj_docs/domain/README.md): ドメイン
- [design](./prj_docs/design/README.md): 設計
- [ui](./prj_docs/ui/README.md): UI
- [operations](./prj_docs/operations/README.md): 運用（Git運用・CI・デプロイ等）

## Development
開発ルールは [AGENTS.md](./AGENTS.md) と [.claude/rules](./.claude/rules) を参照。ブランチ運用・PR規約は [Git Workflow](./prj_docs/operations/git.md) を参照。

セットアップ手順は、Next.jsプロジェクト作成後に追記する。
