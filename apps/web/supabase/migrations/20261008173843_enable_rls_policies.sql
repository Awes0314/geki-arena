-- RLS（prj_docs/design/database.md「RLS」準拠）。運営操作・スコア提出・マスタ更新は Service Role で行う。

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.rating_classes enable row level security;
alter table public.musics enable row level security;
alter table public.charts enable row level security;
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.course_badges enable row level security;
alter table public.course_charts enable row level security;
alter table public.course_challenge_results enable row level security;
alter table public.score_submissions enable row level security;
alter table public.song_scores enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_target_charts enable row level security;
alter table public.competition_participants enable row level security;
alter table public.one_v_one_matches enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.operation_logs enable row level security;

-- users: recovery_code_hash は一般クライアントから参照不可、更新はプロフィール系の列のみ
revoke all on public.users from anon, authenticated;
grant select (
  id, user_no, user_id, display_name, icon_url, bio, sns_links, rating_class_id,
  displayed_badge_id, role, status, settings, created_at, updated_at
) on public.users to authenticated;
grant update (
  display_name, icon_url, bio, sns_links, displayed_badge_id, settings
) on public.users to authenticated;

create policy users_select on public.users
  for select to authenticated using (true);
create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- notifications: 更新は既読フラグのみ
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

-- 参照のみ（認証済みユーザー）
create policy rating_classes_select on public.rating_classes
  for select to authenticated using (true);
create policy musics_select on public.musics
  for select to authenticated using (true);
create policy charts_select on public.charts
  for select to authenticated using (true);
create policy courses_select on public.courses
  for select to authenticated using (true);
create policy course_badges_select on public.course_badges
  for select to authenticated using (true);
create policy course_charts_select on public.course_charts
  for select to authenticated using (true);
create policy course_challenge_results_select on public.course_challenge_results
  for select to authenticated using (true);
create policy competition_target_charts_select on public.competition_target_charts
  for select to authenticated using (true);

-- score_submissions: 順位・合計スコアは全員が参照可能
create policy score_submissions_select on public.score_submissions
  for select to authenticated using (true);

-- song_scores: 詳細な内訳は提出者本人と運営のみ
create policy song_scores_select on public.song_scores
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.score_submissions s
      where s.id = submission_id and s.submitter_id = (select auth.uid())
    )
  );

-- competitions
create policy competitions_select on public.competitions
  for select to authenticated using (true);
create policy competitions_insert_own on public.competitions
  for insert to authenticated with check (organizer_id = (select auth.uid()));
create policy competitions_update_own on public.competitions
  for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

create policy competition_target_charts_insert_own on public.competition_target_charts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.competitions c
      where c.id = competition_id and c.organizer_id = (select auth.uid())
    )
  );

create policy competition_participants_select on public.competition_participants
  for select to authenticated using (true);
create policy competition_participants_insert_own on public.competition_participants
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy competition_participants_update_own on public.competition_participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- one_v_one_matches
create policy one_v_one_matches_select on public.one_v_one_matches
  for select to authenticated using (true);
create policy one_v_one_matches_insert_own on public.one_v_one_matches
  for insert to authenticated with check (creator_id = (select auth.uid()));
create policy one_v_one_matches_update_participant on public.one_v_one_matches
  for update to authenticated
  using (
    creator_id = (select auth.uid()) or opponent_user_id = (select auth.uid())
  )
  with check (
    creator_id = (select auth.uid()) or opponent_user_id = (select auth.uid())
  );

-- notifications
create policy notifications_select_own on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- reports
create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy reports_select on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());

-- operation_logs: 運営のみ参照
create policy operation_logs_select_admin on public.operation_logs
  for select to authenticated using (public.is_admin());
