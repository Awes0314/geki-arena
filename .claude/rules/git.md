# Git Rules

## Branch Strategy
ブランチ運用の方針を以下の通りとする。
- main: 本番環境にデプロイされる安定版のブランチ
- develop: 開発中の統合ブランチ
- feature/*: 新機能や修正のための個別ブランチ

## Commit
Commitの方針は以下の通りとする。
- コミットメッセージはConventional Commitsに従うこと。
- コミット粒度は小さく、意味のある単位で行うこと。

## Pull Request
PRの方針は以下の通りとする。
- PRの単位は小さく、レビューしやすい単位で行うこと。
- レビューは丁寧に行い、必要に応じてコメントを残すこと。

## Prohibited Operations
禁止操作の方針は以下の通りとする。
- mainへの直接push
- developへの直接push
- force push
- reset --hardなど

## Claude's Git Behavior
ClaudeのGit運用方針は以下の通りとする。
- push前に確認すること。
- 大規模な履歴変更前に確認すること。
- commitを勝手にまとめないこと。