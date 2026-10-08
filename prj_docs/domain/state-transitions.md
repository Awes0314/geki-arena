# State Transitions

## Purpose
主要エンティティのライフサイクル（状態遷移）を示す。各状態・遷移条件は`prj_docs/requirements`の記述に基づく。

## User（アカウント状態）
```mermaid
stateDiagram-v2
    [*] --> Active: 登録
    Active --> Suspended: 運営によるアカウント停止
    Suspended --> Active: 運営による停止解除
    Active --> Deleted: 本人によるアカウント削除
    Deleted --> [*]
```
- 出典: `authentication.md`

## Competition（開催状態）
- status（scheduled/ongoing/finished）は日時により導出される値であり、削除のみが明示的な操作。
```mermaid
stateDiagram-v2
    [*] --> Scheduled: 作成(startAt > 作成日時)
    Scheduled --> Ongoing: startAt到達
    Ongoing --> Finished: endAt到達
    Finished --> [*]
    Scheduled --> Deleted: 削除(開催前)
    Ongoing --> Deleted: 削除(参加者0人の場合のみ)
    Ongoing --> Deleted: 運営による強制削除(条件問わず、admin.md参照)
    Deleted --> [*]
```
- 出典: `competition.md`

## CompetitionParticipant（参加状態）
```mermaid
stateDiagram-v2
    [*] --> Joined: 参加
    Joined --> Withdrawn: 離脱(開催前 または 開催中かつ未提出)
    Joined --> Removed: 主催者または運営による参加取消(運営は条件問わず)
    Withdrawn --> [*]
    Removed --> [*]
```
- 出典: `competition.md`

## OneVOneMatch（対戦成立状態）
```mermaid
stateDiagram-v2
    [*] --> Recruiting: 作成(対戦相手未指定)
    [*] --> PendingAcceptance: 作成(対戦相手指定あり)
    Recruiting --> Established: 挑戦確定(ランダム楽曲決定)
    PendingAcceptance --> Established: 承認確定(ランダム楽曲決定)
    Recruiting --> Deleted: 削除(開始前)
    PendingAcceptance --> Deleted: 削除(開始前)
    Established --> Deleted: 運営による強制削除(admin.md参照)
    Established --> Finished: startAtの14日後23:59(JST)到達
    Finished --> [*]
    Deleted --> [*]
```
- 出典: `one-v-one.md`

## CourseChallengeResult（コース挑戦結果）
```mermaid
stateDiagram-v2
    [*] --> Submitted: スコア提出
    Submitted --> Cleared: clearConditionを満たす
    Submitted --> Failed: clearConditionを満たさない
    Failed --> Cleared: 再挑戦でclearConditionを達成
    Cleared --> Cleared: 再挑戦(ベスト記録を更新 または 維持)
```
- 出典: `course.md`, `score.md`

## ScoreSubmission（提出・検証フロー）
```mermaid
stateDiagram-v2
    [*] --> Validating: 提出受付
    Validating --> Invalid: バリデーション失敗(score.md参照)
    Validating --> Valid: バリデーション成功
    Valid --> Applied: 既存記録よりtotalScoreが高い(更新)
    Valid --> NotApplied: 既存記録以下(重複提出/更新なし)
    Invalid --> [*]
    Applied --> [*]
    NotApplied --> [*]
```
- 出典: `score.md`

## Notification（既読状態）
```mermaid
stateDiagram-v2
    [*] --> Unread: 生成
    Unread --> Read: ユーザーが閲覧
    Read --> [*]
```
- 出典: `notification.md`

## Report（通報対応状態）
```mermaid
stateDiagram-v2
    [*] --> Open: 通報受付
    Open --> Resolved: 運営対応完了
    Resolved --> [*]
```
- 出典: `user.md`, `admin.md`
- ※対応フローの詳細は要件未定義のため、ドメイン設計上の簡易な仮定として記載。
