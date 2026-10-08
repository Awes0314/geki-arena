# Glossary

## Purpose
`prj_docs/requirements`および`prj_docs/domain`で使用されている、当システム（Geki Arena）特有の用語・表記を統一的に定義する。設計（`prj_docs/design`等）以降のドキュメントや実装において、本用語集の表記・定義を正とする。

## 表記ルール
- 「日本語表記」を正式名称とし、英語表記はドメインモデル・実装上の識別子（エンティティ名/属性名/列挙値）を示す。
- 列挙値（コード上の固定値）は `code` 表記とする。

---

## ユーザー・認証

| 用語 | 英語/システム表記 | 定義 | 出典 |
|---|---|---|---|
| ユーザーNo | `userNo` | ユーザーに割り当てられる一意の自動採番ID。変更不可、削除後も再割当てされない。 | authentication.md, entities.md |
| ユーザーID | `userId` | ログインに使用する一意の識別子。ユーザー自身が設定する。 | authentication.md |
| 表示名 | `displayName` | プロフィール上に表示される名称。編集可能。 | user.md |
| Rating区分 | `RatingClass` | ユーザーが自己申告（手動入力）で設定する区分。外部データとの照合は行わない。大会参加条件・1v1募集範囲の上限/下限指定に使うため、順序を持つ列挙体である。具体的な区分値は運営が定めるマスタデータ。 | user.md, competition.md, one-v-one.md, entities.md |
| セッション | `Session` | ログイン状態を保持する仕組み。ログアウトまたは有効期限切れで失効する。 | authentication.md |
| アカウント停止 | `status = suspended` | 運営によりログイン・利用が制限された状態。解除により`active`へ復帰する。 | authentication.md |
| アカウント削除 | `status = deleted` | 本人操作による削除。削除後は同一`userId`で再登録不可。 | authentication.md |
| 運営者 | `role = admin` | 管理・運用機能を行う権限を持つユーザー。 | admin.md |
| 通報 | `Report` | ユーザーが他ユーザーの不適切な行動・コンテンツを運営に通知する機能。状態は`open`（未対応）/`resolved`（対応済み）。 | user.md, admin.md |

## 大会（Competition）

| 用語 | 英語/システム表記 | 定義 | 出典 |
|---|---|---|---|
| 大会 | `Competition` | ユーザーが作成する、課題曲のスコアを競うイベント。 | competition.md |
| 主催者 | `organizer` | 大会を作成したユーザー。 | competition.md |
| 課題曲 | `targetCharts` | 大会で提出対象となる譜面（`Chart`）のリスト。1〜10件、重複不可。 | competition.md |
| 参加条件 | `ParticipationCondition` | 大会参加・1v1募集に設定できる任意の条件。Rating区分の上限/下限（片方または両方）を指定可能。 | competition.md, one-v-one.md |
| 連続プレイ必須オプション | `continuousPlayRequired` | trueの場合、課題曲全曲の連続プレイでの提出が必須となる設定（boolean、初期値false）。 | competition.md |
| 開催予定 | `scheduled` | 大会の開始日時が現在日時よりも後である状態。 | competition.md |
| 開催中 | `ongoing` | 開始日時を過ぎ、終了日時前である状態。 | competition.md |
| 終了 | `finished` | 終了日時を過ぎた状態。 | competition.md |
| 参加取消 | `Removed` | 主催者または運営によって参加者が参加を取り消された状態。運営は通常の条件によらず取消可能。 | competition.md, admin.md |
| 離脱 | `Withdrawn` | 参加者自身による参加取り下げ。開催前、または開催中かつ未提出の場合のみ可能。 | competition.md |

## 1v1対戦（OneVOneMatch）

| 用語 | 英語/システム表記 | 定義 | 出典 |
|---|---|---|---|
| 1v1対戦 | `OneVOneMatch` | 2人のユーザーが3曲（自選2曲＋ランダム1曲）の合計スコアで勝敗を競う対戦。 | one-v-one.md |
| 自選楽曲 | `creatorMusic` | 1v1作成者が選択する1曲目の譜面。 | one-v-one.md |
| 相手選択楽曲範囲 | `opponentMusicRange` | 対戦相手が2曲目を選ぶ際のレベル範囲または譜面定数範囲（任意）。 | one-v-one.md |
| ランダム楽曲範囲 | `randomMusicRange` | 3曲目としてランダムに選出される譜面のレベル範囲または譜面定数範囲（必須）。 | one-v-one.md |
| 募集中 | `recruiting` | 対戦相手未指定の1v1対戦が一覧に表示される状態。 | one-v-one.md |
| 挑戦 | `Challenge` | 募集中の1v1対戦に対し、他ユーザーが自選曲を選んで参加を確定させる行為。確定時に対戦が成立する。 | one-v-one.md |
| 承認 | `Acceptance` | 対戦相手として指定されたユーザーが自選曲を選んで参加を確定させる行為。確定時に対戦が成立する。 | one-v-one.md |
| 成立 | `established` | 挑戦または承認が確定し、1v1対戦が開始した状態。この時点でランダム楽曲が決定される。 | one-v-one.md |
| 引き分け | `draw` | 3曲通しスコアの合計が同点だった場合の結果。 | one-v-one.md |

## コース（Course）

| 用語 | 英語/システム表記 | 定義 | 出典 |
|---|---|---|---|
| コース | `Course` | 運営が事前に設定した、複数譜面を連続プレイする固定プログラム。 | course.md |
| CHAPTER | `chapterNumber` | コースの難易度グループ。番号が大きいほど高難易度。 | course.md |
| クリア条件 | `clearCondition` | コースごとに運営が個別に設定する合格条件（例: 各譜面のスコア閾値等）。全コース共通の統一基準はない。 | course.md |
| コースクリア | `result = cleared` | クリア条件を満たした状態。エンブレムSVG（コースバッジ）が付与される。 | course.md |
| コース失敗 | `result = failed` | クリア条件を満たさなかった状態。 | course.md |
| コースバッジ / エンブレム | `CourseBadge` | コースクリアの報酬として付与されるSVG画像。プロフィールやユーザー表示箇所に表示できる（表示は1件のみ選択可）。 | course.md, user.md |

## 楽曲・譜面（Music / Chart）

| 用語 | 英語/システム表記 | 定義 | 出典 |
|---|---|---|---|
| Pongeki | - | 運営が他システムとして運用する、楽曲・譜面情報の提供元システム。 | musics_charts.md |
| 楽曲 | `Music` | 楽曲ID・楽曲名・アーティスト名・ジャケット画像URL・ジャンルを保持するエンティティ。 | musics_charts.md |
| 譜面 | `Chart` | 楽曲ごとに難易度種別単位で存在する、プレイ対象データ。レベル表示値・譜面定数を保持する。 | musics_charts.md |
| 難易度種別 | `DifficultyType` | `BASIC` / `ADVANCED` / `EXPERT` / `MASTER` / `LUNATIC`の5種別。 | musics_charts.md |
| 譜面定数 | `chartConstant` | 譜面ごとに設定される、Rating算出等に用いる定数値。 | musics_charts.md, one-v-one.md |

## スコア（Score）

| 用語 | 英語/システム表記 | 定義 | 出典 |
|---|---|---|---|
| オンゲキNET | - | オンゲキ公式のプレイ履歴確認サイト（https://ongeki-net.com/ongeki-mobile/）。スコア取得の情報源。 | score.md |
| プレイ履歴一覧 | playlog list | オンゲキNET上の、直近プレイ履歴へのリンク一覧ページ（最大50件、プレイ日時降順）。 | score.md |
| プレイ履歴詳細 | playlog detail | オンゲキNET上の、個別プレイの詳細スコア属性を確認できるページ。 | score.md |
| ブックマークレット | bookmarklet | 当システムが提供する、オンゲキNET上で実行しスコアを取得・提出するスクリプト。 | score.md |
| テクニカルスコア | `technicalScore` | オンゲキのプレイ結果スコア値。 | score.md |
| 最大コンボ数 | `maxCombo` | プレイ履歴詳細からのみ取得できるスコア属性。 | score.md |
| CRITICAL BREAK数 / BREAK数 / HIT数 / MISS数 / BELL数 / DAMAGE数 | `criticalBreak` / `break` / `hit` / `miss` / `bell` / `damage` | プレイ履歴詳細からのみ取得できる判定・収集系のスコア属性。 | score.md |
| スコア提出 | `ScoreSubmission` | ブックマークレット実行を起因として行われる、大会・1v1・コースへのスコア登録。 | score.md |
| スコア更新 | Score Update | 新たな提出の合計スコアが既存記録より高い場合にのみベスト記録が更新されるルール。 | score.md |
| 重複提出 | Duplicate Submission | 同一スコアが複数回提出されること。既存スコアを更新しない限り無効。 | score.md |
| 不正スコア | Invalid Score | 属性の形式不備・必須項目欠落などにより無効と判定されたスコア。 | score.md |
| スコアの可視性 | Score Visibility | ランキング（順位・スコア値）は全ユーザーに公開、詳細な内訳属性は提出者本人と運営者のみ閲覧可能というルール。 | score.md |

## 通知・運営（Notification / Admin）

| 用語 | 英語/システム表記 | 定義 | 出典 |
|---|---|---|---|
| 通知 | `Notification` | 大会関連・1v1関連・運営お知らせの発生を契機にユーザーへ届けられるメッセージ。未読/既読の状態を持つ。 | notification.md |
| 運営からのお知らせ（全体通知） | `type = announcement` | 運営が全ユーザー（または一部ユーザー）に一斉配信するお知らせ。 | notification.md, admin.md |
| 操作ログ | `OperationLog` | 運営による操作（アカウント停止、スコア削除、参加取消等）を記録する監査ログ。 | admin.md |

## ドメインモデリング共通用語

| 用語 | 英語/システム表記 | 定義 | 出典 |
|---|---|---|---|
| エンティティ | Entity | 識別子を持ち、ライフサイクルを通じて同一性が維持される概念。 | domain/README.md |
| 値オブジェクト | Value Object | 識別子を持たず、属性の値そのものによって等価性が決まる概念（例: `RatingClass`, `MusicRange`, `SongScore`）。 | domain/entities.md |
| 集約 | Aggregate | 一貫性境界としてまとめられるエンティティ群。外部からは集約ルートのみを参照する。 | domain/relationships.md |
| 不変条件 | Invariant | エンティティ・集約が常に満たすべきビジネスルール。 | domain/entities.md |
