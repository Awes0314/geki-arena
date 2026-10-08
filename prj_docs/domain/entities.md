# Domain Entities

## Purpose
`prj_docs/requirements`配下の要件から導出される、主要なエンティティ・値オブジェクトを定義する。各要素の責務、属性、識別子、不変条件（ビジネスルール）を明確にすることで、設計・実装の一貫性を担保する。

## Entity Overview
| Entity | 概要 | 出典 |
|---|---|---|
| User | ユーザーアカウント | authentication.md, user.md |
| Session | ログインセッション | authentication.md |
| Report | ユーザー通報 | user.md |
| Notification | 個別通知/運営お知らせ | notification.md |
| Music | 楽曲 | musics_charts.md |
| Chart | 譜面 | musics_charts.md |
| Competition | 大会 | competition.md |
| CompetitionParticipant | 大会参加者 | competition.md |
| OneVOneMatch | 1v1対戦 | one-v-one.md |
| Course | コース | course.md |
| CourseChallengeResult | コース挑戦結果 | course.md, score.md |
| CourseBadge | コースクリア報酬エンブレム | course.md |
| ScoreSubmission | スコア提出 | score.md |
| OperationLog | 運営操作ログ | admin.md |

値オブジェクト: `RatingClass` `ParticipationCondition` `MusicRange` `DifficultyType` `SongScore`

---

## User（ユーザー）
### 属性
- userNo: 一意の自動採番ID（不変）
- userId: ログインID（一意）
- passwordHash: パスワードのハッシュ値
- displayName: 表示名
- iconImage: アイコン画像
- bio: 自己紹介
- snsLinks: 外部SNSリンク（複数可）
- ratingClass: Rating区分（`RatingClass`値オブジェクト、自己申告）
- courseBadges: 獲得したコースバッジ（`CourseBadge`）一覧
- displayedBadge: 表示する1件のコースバッジへの参照（任意、未選択の場合は非表示。複数同時表示は不可）
- role: `general` | `admin`
- status: `active` | `suspended` | `deleted`
- settings: 通知設定・表示設定・アカウント設定・UI設定
- recoveryCodeHash: パスワード再設定用リカバリーコードのハッシュ値（登録時に発行、メールアドレスを収集しないための代替手段）

### 識別子
- userNo（またはuserId）

### 不変条件 / ビジネスルール
- userIdはシステム内で一意である。
- userNoは変更不可であり、削除後も再割当てされない。
- status=deletedとなったuserIdは再登録できない。
- status=suspendedの間はログイン・大会参加・スコア提出などの操作ができない。
- userNo・過去戦績はユーザー自身による編集不可。

### 出典
- `authentication.md`, `user.md`

---

## Session（セッション）
### 属性
- sessionId
- user: Userへの参照
- issuedAt: 発行日時
- expiresAt: 有効期限

### 識別子
- sessionId

### 不変条件 / ビジネスルール
- expiresAtを過ぎたセッションは無効。
- ログアウト操作により即時失効する。
- 再ログイン頻度を抑えるため有効期限は長めに設定する。

### 出典
- `authentication.md`

---

## Report（通報）
### 属性
- reportId
- reporter: Userへの参照（通報した人）
- reportedUser: Userへの参照（通報された人）
- reason: 通報理由
- status: `open` | `resolved`
- createdAt

### 識別子
- reportId

### 不変条件 / ビジネスルール
- 対応フローの詳細は未定義のため、`open`→`resolved`という簡易な状態のみをドメイン設計上の仮定として設ける。

### 出典
- `user.md`（Reporting）, `admin.md`

---

## Notification（通知）
### 属性
- notificationId
- recipient: Userへの参照（運営お知らせも送信時に全ユーザー分の通知行に展開されるため、必ず1件のUserを指す）
- type: `competition` | `one_v_one` | `announcement`
- title / body
- relatedEntityRef: 関連する大会/1v1等への参照（任意）
- isRead: 既読状態
- createdAt

### 識別子
- notificationId

### 不変条件 / ビジネスルール
- 運営お知らせ（`announcement`）は、配信対象全ユーザー分のNotificationが生成される（ユーザーごとに既読/未読を管理するため）。
- ユーザーが閲覧することで`isRead`がtrueになる。

### 出典
- `notification.md`

---

## Music（楽曲）
### 属性
- musicId: Pongeki由来の識別子
- title: 楽曲名
- artist: アーティスト名
- jacketImageUrl: ジャケット画像URL
- genre: ジャンル

### 識別子
- musicId

### 出典
- `musics_charts.md`

---

## Chart（譜面）
### 属性
- chartId
- music: Musicへの参照
- difficultyType: `DifficultyType`値オブジェクト（BASIC/ADVANCED/EXPERT/MASTER/LUNATIC）
- level: レベル表示値
- chartConstant: 譜面定数

### 識別子
- chartId

### 不変条件 / ビジネスルール
- 同一楽曲内でdifficultyTypeは重複しない。

### 出典
- `musics_charts.md`

---

## Competition（大会）
### 属性
- competitionId
- organizer: Userへの参照
- name / description
- startAt / endAt
- participationCondition: `ParticipationCondition`値オブジェクト（任意）
- targetCharts: Chartへの参照リスト（1〜10件）
- continuousPlayRequired: boolean（初期値false）
- status: 導出値（`scheduled` | `ongoing` | `finished`、`state-transitions.md`参照）

### 識別子
- competitionId

### 不変条件 / ビジネスルール
- targetChartsは1件以上10件以内であり、同一譜面の重複指定不可。
- startAtは作成時点の現在日時より後、endAtはstartAtより後。
- 開催期間は24時間以上90日以内、10分単位。
- 同一organizerが主催する大会同士で開催期間が重複しない。
- 編集可能な項目はdescriptionのみ。
- 削除は「開催前」または「参加者が0人」の場合のみ可能。
- 運営者（role=admin）は、問題がある大会に対しては上記条件によらず削除できる（`admin.md`参照）。

### 出典
- `competition.md`

---

## CompetitionParticipant（大会参加者）
### 属性
- competition: Competitionへの参照
- user: Userへの参照
- joinedAt
- withdrawnAt（任意）
- bestSubmission: ScoreSubmissionへの参照（任意、ランキング算出用のベスト記録）

### 識別子
- (competitionId, userId) の複合キー

### 不変条件 / ビジネスルール
- participationConditionを満たさないユーザーは参加できない。
- 離脱は「開催前」または「開催中かつ自身の提出が0件」の場合のみ可能。
- organizerは自身の大会にも参加できる。
- 運営者（role=admin）は、問題がある参加者を条件によらず参加取消できる（`admin.md`参照）。

### 出典
- `competition.md`

---

## OneVOneMatch（1v1対戦）
### 属性
- matchId
- creator: Userへの参照
- creatorMusic: Chartへの参照（自選楽曲）
- opponentMusicRange: `MusicRange`値オブジェクト（任意、相手選択楽曲の範囲）
- randomMusicRange: `MusicRange`値オブジェクト（必須、ランダム楽曲の範囲）
- opponentUser: Userへの参照（任意、対戦希望相手の指定がある場合）
- recruitingRatingRange: `ParticipationCondition`値オブジェクト（任意、募集時のRating区分範囲）
- opponentSelectedMusic: Chartへの参照（挑戦/承認確定時に決定）
- randomSelectedMusic: Chartへの参照（成立時に決定）
- status: 導出値（`recruiting` | `pending_acceptance` | `established` | `finished`、`state-transitions.md`参照）
- startAt（成立時刻、任意）/ endAt（導出: startAtの14日後 日本時間23:59）
- creatorSubmission / opponentSubmission: ScoreSubmissionへの参照（任意）

### 識別子
- matchId

### 不変条件 / ビジネスルール
- opponentUser未指定の場合は1v1一覧に「募集中」として表示される。
- 挑戦または承認が確定した時点で対戦が成立し、同時にrandomSelectedMusicが決定される。
- 削除は開始前（成立前）に限り可能。
- 運営者（role=admin）は、問題がある1v1対戦に対しては開始後であっても削除できる（`admin.md`参照）。
- endAtはstartAtの14日後23:59（JST）で固定。

### 出典
- `one-v-one.md`

---

## Course（コース）
### 属性
- courseId
- chapterNumber: CHAPTER番号（難易度の目安、値が大きいほど高難易度）
- courseName
- orderedCharts: Chartへの参照リスト（順序あり、連続プレイが前提）
- clearCondition: コースごとに運営が個別設定する合格条件（例: 各譜面のスコア閾値等）
- rewardBadge: CourseBadgeへの参照

### 識別子
- courseId

### 出典
- `course.md`

---

## CourseChallengeResult（コース挑戦結果）
### 属性
- user: Userへの参照
- course: Courseへの参照
- latestSubmission: ScoreSubmissionへの参照
- result: `cleared` | `failed`
- achievedAt: クリア日時（任意）

### 識別子
- (courseId, userId) の複合キー（ユーザーごとのベスト記録を保持）

### 不変条件 / ビジネスルール
- 挑戦に事前手続きは不要で、何度でも再挑戦・再提出が可能。
- スコア更新は、新たな提出の合計スコアが既存記録より高い場合にのみ反映される。
- clearConditionを満たした場合、resultが`cleared`となりCourseBadgeが付与される。

### 出典
- `course.md`, `score.md`

---

## CourseBadge（コースバッジ/エンブレム）
### 属性
- badgeId
- course: Courseへの参照
- svgAsset: エンブレムSVG

### 出典
- `course.md`

---

## ScoreSubmission（スコア提出）
### 属性
- submissionId
- submitter: Userへの参照
- context: Competition・OneVOneMatch・Courseのいずれかへの参照（提出先）
- submittedAt
- songScores: `SongScore`値オブジェクトのリスト（連続プレイ必須の場合は課題曲全曲分）
- totalScore: songScoresの合計（導出値）
- validationStatus: `valid` | `invalid`
- updateApplied: boolean（既存記録を更新したか）

### 識別子
- submissionId

### 不変条件 / ビジネスルール
- 提出は対象コンテキストの開催期間内のみ有効（大会・1v1）。
- continuousPlayRequired=trueの対象では、課題曲全曲の連続プレイ分が必要。
- `score.md`のバリデーションルールを満たさない場合はinvalidとなる。
- 既存記録より合計スコアが高い場合にのみ、ランキング/ベスト記録が更新される（updateApplied=true）。

### 出典
- `score.md`, `competition.md`, `one-v-one.md`, `course.md`

---

## OperationLog（運営操作ログ）
### 属性
- logId
- operator: Userへの参照（role=admin）
- actionType: 操作種別（例: アカウント停止、スコア削除、参加取消等）
- targetRef: 操作対象への参照
- detail: 詳細情報
- createdAt

### 出典
- `admin.md`（監査目的のドメイン設計上の仮定エンティティ）

---

## 値オブジェクト

### RatingClass
- ユーザーが自己申告で設定するRating区分。
- 具体的な区分値・名称は運営が定義するマスタデータであり、本ドキュメントでは確定しない。
- 大会参加条件・1v1募集範囲での上限/下限指定に使用されるため、順序を持つ列挙体（大小比較可能）である。

### ParticipationCondition
- ratingMin（任意）/ ratingMax（任意）
- 大会参加条件・1v1募集条件で使用。

### MusicRange
- levelMin/levelMax または chartConstantMin/chartConstantMaxのいずれか一方を指定。
- 1v1の相手選択楽曲範囲・ランダム楽曲範囲で使用。

### DifficultyType
- `BASIC` | `ADVANCED` | `EXPERT` | `MASTER` | `LUNATIC`

### SongScore
- music / difficulty / playDateTime
- technicalScore / maxCombo / criticalBreak / break / hit / miss / bell / damage
- jacketImageUrl
- すべての数値項目は0以上の整数（`score.md`のバリデーションルールに従う）

