-- 初期スキーマ（prj_docs/design/database.md 準拠）

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- マスタ
create table public.rating_classes (
  id smallint primary key,
  code text not null unique,
  label text not null,
  sort_order smallint not null unique
);

create table public.musics (
  id text primary key,
  title text not null,
  artist text not null,
  jacket_image_url text,
  genre text,
  updated_at timestamptz not null default now()
);

create table public.charts (
  id uuid primary key default gen_random_uuid(),
  music_id text not null references public.musics (id),
  difficulty_type text not null
    check (difficulty_type in ('BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'LUNATIC')),
  level text not null,
  chart_constant numeric(4, 1) not null,
  unique (music_id, difficulty_type)
);

-- ユーザー（displayed_badge_id の FK は course_badges 作成後に追加）
create table public.users (
  id uuid primary key references auth.users (id),
  user_no bigint generated always as identity unique,
  user_id text not null unique,
  display_name text not null,
  icon_url text,
  bio text,
  sns_links jsonb not null default '[]',
  rating_class_id smallint references public.rating_classes (id),
  displayed_badge_id uuid,
  role text not null default 'general' check (role in ('general', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  settings jsonb not null default '{}',
  recovery_code_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- コース（reward_badge_id の FK は course_badges 作成後に追加）
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  chapter_number smallint not null,
  course_name text not null,
  clear_condition jsonb not null,
  reward_badge_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_badges (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references public.courses (id),
  svg_asset_url text not null
);

-- courses <-> course_badges は相互参照のため、コミット時にチェックする
alter table public.courses
  add constraint courses_reward_badge_id_fkey
  foreign key (reward_badge_id) references public.course_badges (id)
  deferrable initially deferred;

alter table public.users
  add constraint users_displayed_badge_id_fkey
  foreign key (displayed_badge_id) references public.course_badges (id);

create table public.course_charts (
  course_id uuid not null references public.courses (id),
  order_index smallint not null,
  chart_id uuid not null references public.charts (id),
  primary key (course_id, order_index)
);

-- スコア（best_submission_id 等から参照される）
create table public.score_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid not null references public.users (id),
  context_type text not null check (context_type in ('competition', 'one_v_one', 'course')),
  -- context_type に応じたポリモーフィック参照のため FK は張らない
  context_id uuid not null,
  submitted_at timestamptz not null default now(),
  total_score bigint not null,
  validation_status text not null check (validation_status in ('valid', 'invalid')),
  update_applied boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.song_scores (
  submission_id uuid not null references public.score_submissions (id),
  order_index smallint not null,
  chart_id uuid references public.charts (id),
  play_date_time timestamptz not null,
  technical_score bigint not null check (technical_score >= 0),
  max_combo integer check (max_combo >= 0),
  critical_break integer check (critical_break >= 0),
  break_count integer check (break_count >= 0),
  hit_count integer check (hit_count >= 0),
  miss_count integer check (miss_count >= 0),
  bell_count text,
  damage_count integer check (damage_count >= 0),
  jacket_image_url text,
  primary key (submission_id, order_index)
);

create table public.course_challenge_results (
  course_id uuid not null references public.courses (id),
  user_id uuid not null references public.users (id),
  latest_submission_id uuid not null references public.score_submissions (id),
  result text not null check (result in ('cleared', 'failed')),
  achieved_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (course_id, user_id)
);

-- 大会
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users (id),
  name text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  participation_rating_min_id smallint references public.rating_classes (id),
  participation_rating_max_id smallint references public.rating_classes (id),
  continuous_play_required boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (end_at - start_at between interval '24 hours' and interval '90 days')
);

create table public.competition_target_charts (
  competition_id uuid not null references public.competitions (id),
  chart_id uuid not null references public.charts (id),
  order_index smallint not null,
  primary key (competition_id, chart_id)
);

create table public.competition_participants (
  competition_id uuid not null references public.competitions (id),
  user_id uuid not null references public.users (id),
  joined_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  removed_at timestamptz,
  removed_by uuid references public.users (id),
  best_submission_id uuid references public.score_submissions (id),
  primary key (competition_id, user_id)
);

-- 1v1
create table public.one_v_one_matches (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users (id),
  creator_chart_id uuid not null references public.charts (id),
  opponent_range_type text check (opponent_range_type in ('level', 'chart_constant')),
  opponent_range_min numeric,
  opponent_range_max numeric,
  random_range_type text not null check (random_range_type in ('level', 'chart_constant')),
  random_range_min numeric not null,
  random_range_max numeric not null,
  opponent_user_id uuid references public.users (id),
  recruiting_rating_min_id smallint references public.rating_classes (id),
  recruiting_rating_max_id smallint references public.rating_classes (id),
  opponent_selected_chart_id uuid references public.charts (id),
  random_selected_chart_id uuid references public.charts (id),
  status text not null default 'recruiting'
    check (status in ('recruiting', 'pending_acceptance', 'established', 'deleted')),
  start_at timestamptz,
  end_at timestamptz,
  creator_submission_id uuid references public.score_submissions (id),
  opponent_submission_id uuid references public.score_submissions (id),
  deleted_at timestamptz,
  deleted_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 通知・通報・運営ログ
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id),
  type text not null check (type in ('competition', 'one_v_one', 'announcement')),
  title text not null,
  body text not null,
  related_entity_type text
    check (related_entity_type in ('competition', 'one_v_one_match', 'course')),
  related_entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id),
  reported_user_id uuid not null references public.users (id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create table public.operation_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.users (id),
  action_type text not null,
  target_type text not null,
  target_id uuid not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- インデックス（users の user_id / user_no は UNIQUE 制約で作成済み）
create index competitions_organizer_period_idx
  on public.competitions (organizer_id, start_at, end_at);
create index competition_participants_user_id_idx
  on public.competition_participants (user_id);
create index one_v_one_matches_status_idx on public.one_v_one_matches (status);
create index one_v_one_matches_opponent_user_id_idx
  on public.one_v_one_matches (opponent_user_id);
create index score_submissions_context_submitter_idx
  on public.score_submissions (context_type, context_id, submitter_id);
create index notifications_recipient_idx
  on public.notifications (recipient_id, is_read, created_at);

-- updated_at 自動更新
create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.musics
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.competitions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.one_v_one_matches
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.course_challenge_results
  for each row execute function public.set_updated_at();

-- ビュー（呼び出し元の RLS を適用する）
create view public.competition_status
with (security_invoker = true) as
select
  c.id as competition_id,
  case
    when now() < c.start_at then 'scheduled'
    when now() < c.end_at then 'ongoing'
    else 'finished'
  end as status
from public.competitions c;

-- 同点は提出日時の早い方を上位とする
create view public.competition_rankings
with (security_invoker = true) as
select
  p.competition_id,
  p.user_id,
  s.total_score,
  s.submitted_at,
  row_number() over (
    partition by p.competition_id
    order by s.total_score desc, s.submitted_at asc
  ) as rank
from public.competition_participants p
join public.score_submissions s on s.id = p.best_submission_id
where p.withdrawn_at is null
  and p.removed_at is null;
