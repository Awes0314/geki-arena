# Database Design

## Database Overview
- Supabase（PostgreSQL）を使用する。
- テーブルは`prj_docs/domain/entities.md`のエンティティ・値オブジェクトを正として設計する。
- 命名規則はPostgresの慣習に従いスネークケース（例: `user_no`）とする。
- 認証関連ユーザー（`auth.users`）はSupabase Authが管理し、アプリケーション固有のプロフィール情報は`public.users`に保持する（1:1、`public.users.id`が`auth.users.id`を参照）。

## Tables

### public.users（User）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK, references auth.users(id) | Supabase Auth発行のユーザーID |
| user_no | bigint | UNIQUE NOT NULL, 自動採番 | ユーザーNo（不変） |
| user_id | text | UNIQUE NOT NULL | ログインID |
| display_name | text | NOT NULL | 表示名 |
| icon_url | text | NULL可 | アイコン画像URL |
| bio | text | NULL可 | 自己紹介 |
| sns_links | jsonb | NOT NULL DEFAULT '[]' | 外部SNSリンク一覧 |
| rating_class_id | smallint | FK -> rating_classes(id), NULL可 | Rating区分 |
| displayed_badge_id | uuid | FK -> course_badges(id), NULL可 | 表示中のコースバッジ（1件のみ） |
| role | text | NOT NULL DEFAULT 'general', CHECK IN ('general','admin') | 権限ロール |
| status | text | NOT NULL DEFAULT 'active', CHECK IN ('active','suspended','deleted') | アカウント状態 |
| settings | jsonb | NOT NULL DEFAULT '{}' | 通知/表示/アカウント/UI設定 |
| recovery_code_hash | text | NOT NULL | パスワード再設定用リカバリーコードのハッシュ |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

### public.rating_classes（RatingClass マスタ）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | smallint | PK | |
| code | text | UNIQUE NOT NULL | 区分コード |
| label | text | NOT NULL | 表示名（運営が定義） |
| sort_order | smallint | UNIQUE NOT NULL | 大小比較用の順序 |

### public.reports（Report）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| reporter_id | uuid | FK -> users(id) NOT NULL | 通報者 |
| reported_user_id | uuid | FK -> users(id) NOT NULL | 被通報者 |
| reason | text | NOT NULL | 通報理由 |
| status | text | NOT NULL DEFAULT 'open', CHECK IN ('open','resolved') | 対応状況 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

### public.notifications（Notification）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| recipient_id | uuid | FK -> users(id) NOT NULL | 受信者（運営お知らせも含め必ず1ユーザーに紐づく） |
| type | text | NOT NULL, CHECK IN ('competition','one_v_one','announcement') | 通知種別 |
| title | text | NOT NULL | |
| body | text | NOT NULL | |
| related_entity_type | text | NULL可, CHECK IN ('competition','one_v_one_match','course') | 関連エンティティ種別 |
| related_entity_id | uuid | NULL可 | 関連エンティティID |
| is_read | boolean | NOT NULL DEFAULT false | 既読状態 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

### public.musics（Music）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | text | PK | Pongeki由来の楽曲ID |
| title | text | NOT NULL | 楽曲名 |
| artist | text | NOT NULL | アーティスト名 |
| jacket_image_url | text | NULL可 | ジャケット画像URL |
| genre | text | NULL可 | ジャンル |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Pongeki連携の最終更新日時 |

### public.charts（Chart）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| music_id | text | FK -> musics(id) NOT NULL | |
| difficulty_type | text | NOT NULL, CHECK IN ('BASIC','ADVANCED','EXPERT','MASTER','LUNATIC') | 難易度種別 |
| level | text | NOT NULL | レベル表示値（例: "13+"） |
| chart_constant | numeric(4,1) | NOT NULL | 譜面定数 |
| UNIQUE(music_id, difficulty_type) | | | 同一楽曲内で難易度重複不可（entities.md不変条件） |

### public.competitions（Competition）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| organizer_id | uuid | FK -> users(id) NOT NULL | 主催者 |
| name | text | NOT NULL | 大会名 |
| description | text | NULL可 | 説明（唯一の編集可能項目） |
| start_at | timestamptz | NOT NULL | |
| end_at | timestamptz | NOT NULL, CHECK (end_at > start_at) | |
| participation_rating_min_id | smallint | FK -> rating_classes(id), NULL可 | 参加条件（下限） |
| participation_rating_max_id | smallint | FK -> rating_classes(id), NULL可 | 参加条件（上限） |
| continuous_play_required | boolean | NOT NULL DEFAULT false | |
| deleted_at | timestamptz | NULL可 | 論理削除日時（運営による強制削除を含む） |
| deleted_by | uuid | FK -> users(id), NULL可 | 削除実行者 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- `status`（scheduled/ongoing/finished）は保存せず、`start_at`/`end_at`と現在時刻から導出するビュー（`competition_status`、後述）で算出する。

### public.competition_target_charts（Competition - Chart 中間テーブル）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| competition_id | uuid | FK -> competitions(id) | |
| chart_id | uuid | FK -> charts(id) | |
| order_index | smallint | NOT NULL | 課題曲の表示順 |
| PRIMARY KEY (competition_id, chart_id) | | | |

### public.competition_participants（CompetitionParticipant）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| competition_id | uuid | FK -> competitions(id) | |
| user_id | uuid | FK -> users(id) | |
| joined_at | timestamptz | NOT NULL DEFAULT now() | |
| withdrawn_at | timestamptz | NULL可 | 自己都合の離脱 |
| removed_at | timestamptz | NULL可 | 主催者/運営による参加取消 |
| removed_by | uuid | FK -> users(id), NULL可 | |
| best_submission_id | uuid | FK -> score_submissions(id), NULL可 | ベスト記録 |
| PRIMARY KEY (competition_id, user_id) | | | |

### public.one_v_one_matches（OneVOneMatch）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| creator_id | uuid | FK -> users(id) NOT NULL | |
| creator_chart_id | uuid | FK -> charts(id) NOT NULL | 自選楽曲 |
| opponent_range_type | text | NULL可, CHECK IN ('level','chart_constant') | 相手選択楽曲範囲の種別 |
| opponent_range_min | numeric | NULL可 | |
| opponent_range_max | numeric | NULL可 | |
| random_range_type | text | NOT NULL, CHECK IN ('level','chart_constant') | ランダム楽曲範囲の種別 |
| random_range_min | numeric | NOT NULL | |
| random_range_max | numeric | NOT NULL | |
| opponent_user_id | uuid | FK -> users(id), NULL可 | 指定対戦相手 |
| recruiting_rating_min_id | smallint | FK -> rating_classes(id), NULL可 | |
| recruiting_rating_max_id | smallint | FK -> rating_classes(id), NULL可 | |
| opponent_selected_chart_id | uuid | FK -> charts(id), NULL可 | |
| random_selected_chart_id | uuid | FK -> charts(id), NULL可 | |
| status | text | NOT NULL DEFAULT 'recruiting', CHECK IN ('recruiting','pending_acceptance','established','deleted') | 成立状態（finishedはend_atから導出） |
| start_at | timestamptz | NULL可 | 成立時刻 |
| end_at | timestamptz | NULL可 | start_atの14日後23:59(JST)、成立時に計算し保存 |
| creator_submission_id | uuid | FK -> score_submissions(id), NULL可 | |
| opponent_submission_id | uuid | FK -> score_submissions(id), NULL可 | |
| deleted_at | timestamptz | NULL可 | |
| deleted_by | uuid | FK -> users(id), NULL可 | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

### public.courses（Course）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| chapter_number | smallint | NOT NULL | |
| course_name | text | NOT NULL | |
| clear_condition | jsonb | NOT NULL | コースごとに運営が設定する合格条件（構造は実装時に確定） |
| reward_badge_id | uuid | FK -> course_badges(id) NOT NULL | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

### public.course_charts（Course - Chart 中間テーブル、順序あり）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| course_id | uuid | FK -> courses(id) | |
| order_index | smallint | NOT NULL | 連続プレイの順序 |
| chart_id | uuid | FK -> charts(id) NOT NULL | |
| PRIMARY KEY (course_id, order_index) | | | |

### public.course_badges（CourseBadge）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| course_id | uuid | FK -> courses(id) UNIQUE NOT NULL | |
| svg_asset_url | text | NOT NULL | エンブレムSVGの格納先URL |

### public.course_challenge_results（CourseChallengeResult）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| course_id | uuid | FK -> courses(id) | |
| user_id | uuid | FK -> users(id) | |
| latest_submission_id | uuid | FK -> score_submissions(id) NOT NULL | |
| result | text | NOT NULL, CHECK IN ('cleared','failed') | |
| achieved_at | timestamptz | NULL可 | 初回クリア日時 |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |
| PRIMARY KEY (course_id, user_id) | | | |

### public.score_submissions（ScoreSubmission）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| submitter_id | uuid | FK -> users(id) NOT NULL | |
| context_type | text | NOT NULL, CHECK IN ('competition','one_v_one','course') | |
| context_id | uuid | NOT NULL | ポリモーフィック参照（`context_type`に応じて対象テーブルのidを指す。DB外部キーは設定せずアプリケーション層で整合性を保証する） |
| submitted_at | timestamptz | NOT NULL DEFAULT now() | |
| total_score | bigint | NOT NULL | songScoresの合計（非正規化、ランキング算出用） |
| validation_status | text | NOT NULL, CHECK IN ('valid','invalid') | |
| update_applied | boolean | NOT NULL DEFAULT false | 既存記録を更新したか |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

### public.song_scores（SongScore 値オブジェクト、ScoreSubmissionの子レコード）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| submission_id | uuid | FK -> score_submissions(id) NOT NULL | |
| order_index | smallint | NOT NULL | 連続プレイ時の曲順 |
| chart_id | uuid | FK -> charts(id), NULL可 | 楽曲名/難易度からの名寄せに失敗した場合はNULLを許容し、運営確認対象とする |
| play_date_time | timestamptz | NOT NULL | |
| technical_score | bigint | NOT NULL CHECK (technical_score >= 0) | |
| max_combo | integer | NULL可 CHECK (max_combo >= 0) | プレイ履歴一覧のみの提出ではNULL |
| critical_break | integer | NULL可 CHECK (critical_break >= 0) | |
| break_count | integer | NULL可 CHECK (break_count >= 0) | |
| hit_count | integer | NULL可 CHECK (hit_count >= 0) | |
| miss_count | integer | NULL可 CHECK (miss_count >= 0) | |
| bell_count | text | NULL可 | "実スコア/理論値スコア"形式 |
| damage_count | integer | NULL可 CHECK (damage_count >= 0) | |
| jacket_image_url | text | NULL可 | |
| PRIMARY KEY (submission_id, order_index) | | | |

### public.operation_logs（OperationLog）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| operator_id | uuid | FK -> users(id) NOT NULL | role=adminのユーザー |
| action_type | text | NOT NULL | 例: 'user_suspend', 'score_delete', 'participant_remove' 等 |
| target_type | text | NOT NULL | 操作対象のエンティティ種別 |
| target_id | uuid | NOT NULL | 操作対象のID |
| detail | jsonb | NOT NULL DEFAULT '{}' | 詳細情報 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

## Columns
- 各テーブルのカラム定義は、上記「Tables」内の表に統合して記載する（テーブルごとにカラム名・型・制約・説明を一覧化しているため、本節では独立したカラム一覧は設けない）。

## Primary Keys
- 各テーブルの主キーは上表の通り。中間テーブル（`competition_target_charts`, `competition_participants`, `course_charts`, `course_challenge_results`）は複合主キーとする。

## Foreign Keys
- 上表の「FK」列を参照。`score_submissions.context_id`のみポリモーフィック参照のためDB外部キー制約を設定しない（アプリケーション層のトランザクション内で整合性を確保する）。

## Indexes
- `users(user_id)`, `users(user_no)`: UNIQUE（検索・ログイン用）
- `competitions(organizer_id, start_at, end_at)`: 主催者の開催期間重複チェック用
- `competition_participants(user_id)`: ユーザーの参加履歴取得用
- `one_v_one_matches(status)`, `one_v_one_matches(opponent_user_id)`: 「募集中」一覧・承認待ち一覧取得用
- `score_submissions(context_type, context_id, submitter_id)`: ベスト記録・履歴取得用
- `notifications(recipient_id, is_read, created_at)`: 通知一覧取得用

## Constraints
- `charts`: `UNIQUE(music_id, difficulty_type)`（entities.md「同一楽曲内でdifficultyTypeは重複しない」）
- `competitions`: `CHECK (end_at > start_at)`、`CHECK (end_at - start_at BETWEEN interval '24 hours' AND interval '90 days')`
- `competition_target_charts`: 大会あたりの課題曲数（1〜10件）はアプリケーション層でバリデーションする（CHECK制約でのCOUNT検証はPostgresの標準機能では困難なため）。
- 同一organizerの大会開催期間重複チェックは、アプリケーション層（Server Action）で排他的に検証する（`.claude/rules/coding_style.md`の排他制御方針に従う）。

## RLS
- 全テーブルでRLSを有効化する。
- 基本方針:
  - 参照系: 原則として認証済みユーザーであれば参照可能とし、`score_visibility`（`score.md`参照）に該当する詳細スコア属性（`song_scores`の内訳列）は、`submitter_id = auth.uid()`または`role = admin`のユーザーのみ参照可能とするビュー/ポリシーを設ける。
  - 更新系: 自身が所有する行（`organizer_id`, `submitter_id`, `user_id`等が`auth.uid()`と一致）のみ更新可能とし、運営操作（オーバーライド含む）はService Roleで実施する。
  - `operation_logs`, `rating_classes`: 一般ユーザーからの書き込みは不可。`operation_logs`の参照は`role = admin`のみ許可する。
- 詳細なポリシー定義（SQL）は実装時にマイグレーションファイルとして作成する。

## Triggers
- 各テーブルの`updated_at`自動更新トリガー（共通関数`set_updated_at()`）。
- スコア提出に伴う関連レコードの更新はDBトリガーでは行わず、アプリケーション層で行う。
  - `score_submissions`・`song_scores`の登録時に、`validation_status`・`total_score`を確定した上で、`update_applied=true`の場合に限り`competition_participants.best_submission_id` / `one_v_one_matches.creator_submission_id`or`opponent_submission_id` / `course_challenge_results.latest_submission_id`を同一トランザクション内で更新する。
  - これらの書き込みはService Roleクライアントで行う（RLSに`score_submissions`・`song_scores`の書き込みポリシーは設けない）。

## Functions
- `set_updated_at()`: 共通の`updated_at`更新関数。
- 大会のランキング算出、1v1の勝敗判定、コースのクリア判定は、ビューまたはアプリケーション層の関数として実装する（詳細は実装時に確定）。

## Views
- `competition_status`: `competitions`から`start_at`/`end_at`と現在時刻を元に`scheduled`/`ongoing`/`finished`を算出するビュー。
- `competition_rankings`: `competition_participants` + `score_submissions`から、大会ごとのランキング（スコア降順、同点は提出日時昇順）を算出するビュー（`competition.md`のタイブレークルール準拠）。

## Data Retention
- スコア提出履歴（`score_submissions`, `song_scores`）は、運営による削除（`score.md`の「Score Deletion」）がない限り保持する。
- `operation_logs`は監査目的のため、原則として削除しない。
- アカウント削除（`status=deleted`）時のユーザー関連データの扱い（完全削除 or 匿名化保持）は、個人情報を収集しない方針（`overview.md`）を踏まえ、今後の運用で確定する。

## Migration Policy
- Supabase CLIによるSQLマイグレーションファイルで管理する。
- マイグレーションはリポジトリにコミットし、`.claude/rules/git.md`のブランチ運用・コミット規約に従ってレビューを経て適用する。
