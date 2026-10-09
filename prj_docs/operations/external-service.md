# External Services

## Supabase
- Purpose: データベース（PostgreSQL）、認証（Supabase Auth）。
- Used Features: Postgres（テーブル/RLS/ビュー/トリガー）、Auth（`design/authentication.md`参照）、Storage（アイコン画像、`design/database.md`の「Storage」参照）。
- Project Separation: 無料枠の制約（プロジェクト数上限2）を踏まえ、Development用・Production用の2プロジェクトを作成する。Staging用プロジェクトは当面作成しない。

## Vercel
- Purpose: ホスティング、デプロイ（`deployment.md`参照）。
- Configuration: GitHubリポジトリ連携によるGit-based Deployment。環境変数はDevelopment/Productionの各Vercel環境ごとに設定する（`environments.md`参照）。

## Resend
- 使用しない。要件上メールアドレスを収集しない方針（`overview.md`のNon-Goals、`authentication.md`参照）のため、メール送信機能自体が不要である。

## Other Services
- 現時点で上記以外の外部サービスは利用しない。

## Service Dependencies
- オンゲキNET: スコア取得元。当システムのサーバーからは直接アクセスせず、ユーザーのブラウザ上でブックマークレットが直接アクセスする（`design/architecture.md`参照）。システム側からの可用性依存はないが、オンゲキNET側の仕様変更によりブックマークレットの取得ロジックが影響を受ける可能性がある。
- Pongeki: 楽曲・譜面マスタデータの取得元。運営操作による手動更新のため、障害時は更新処理が失敗するのみで、システム全体の可用性には影響しない（`musics_charts.md`参照）。

## Failure Handling
- Supabase障害時: データベース・認証の双方が利用不可となるため、システム全体が影響を受ける。Supabaseのステータスページを確認し、復旧を待つ。
- Vercel障害時: デプロイ・ホスティングに影響するが、既存のデプロイ済みアプリケーションの稼働には直接影響しない場合が多い。
- オンゲキNET障害時: スコア取得（ブックマークレット実行）のみ影響を受ける。大会閲覧・ランキング表示等、既存データに基づく機能は継続利用可能。