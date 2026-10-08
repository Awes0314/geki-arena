# Admin Requirements

## Overview
- 運営者（Operator）が行う管理・運用機能に関する要件を定義する。
- 他ドキュメントに散在する運営者向け機能を整理し、横断的な権限・機能として定義する。

## User Management
- ユーザーのアカウントを停止/解除することができる。（`authentication.md`参照）
- ユーザーからの通報（`user.md`の「Reporting」参照）を確認し、対応することができる。
  - 通報には未対応/対応済みの状態がある。

## Score Management
- 提出されたスコアを削除することができる。（`score.md`の「Score Deletion」参照）
- 不正なスコア（`score.md`の「Invalid Score」参照）を確認し、対応することができる。

## Music / Chart Management
- 楽曲および譜面情報の更新処理を手動で呼び出すことができる。（`musics_charts.md`の「Update」参照）

## Competition / 1v1 / Course Oversight
- すべての大会・1v1対戦・コースの詳細情報（参加者、提出状況、履歴を含む）を閲覧することができる。
- 問題がある大会・1v1対戦・参加者に対して、`competition.md`・`one-v-one.md`に定める通常の削除条件によらず、削除や参加取消などの対応を行うことができる。
- コースのクリア条件等の設定を行うことができる。（`course.md`参照）

## Announcement
- 全ユーザーに向けたお知らせ（全体通知）を作成し、配信することができる。（`notification.md`参照）

## Operation Log
- 運営者による操作（アカウント停止、スコア削除、参加取消など）は操作ログとして記録される。
- 運営者は操作ログを閲覧し、過去の対応内容を確認することができる。
