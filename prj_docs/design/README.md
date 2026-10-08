# Design

## Purpose
この階層に配置されたドキュメントは、`prj_docs/requirements`・`prj_docs/domain`を踏まえた技術設計を明確に定義することを目的とする。

## Architecture Overview
Next.js（App Router）をフロントエンド兼バックエンド（Server Component / Server Action / Route Handler）として用い、Supabase（PostgreSQL + Auth）をデータ永続化・認証基盤として利用する。Vercel上にホスティングする。

## Technology Stack
- Frontend / Backend: Next.js（App Router、Server Component中心）
- Database: PostgreSQL（Supabase）
- Auth: Supabase Auth
- Hosting: Vercel
- CI/CD: GitHub Actions
- Test: Jest
- Styling: Tailwind CSS, Framer Motion

## Design Principles
- `prj_docs/domain`のエンティティ・値オブジェクトを正とし、テーブル・API設計を導出する。
- データアクセスはServer Component / Server Action / Route Handlerなど、サーバー側からのアクセスを基本とする。クライアント（Client Component）からSupabaseクライアントで直接テーブルへアクセスすることは行わない。
- 通常のデータアクセスには、ログインユーザーの権限で動作するSupabaseクライアント（RLSが適用される）を使用する。Service Role（RLSをバイパスするクライアント）は、運営機能やユーザー登録処理など、必要な範囲に限定して使用する。
- `.claude/rules/coding_style.md`の方針（strict mode、単一責任、適切な抽象化等）に従う。

## Document Structure
この階層に配置されたドキュメントは、以下の構造で整理されている。

- `./architecture.md`: システム全体のアーキテクチャ
- `./database.md`: データベース設計（テーブル・制約・RLS等）
- `./api.md`: API設計
- `./authentication.md`: 認証設計
- `./security.md`: セキュリティ設計
