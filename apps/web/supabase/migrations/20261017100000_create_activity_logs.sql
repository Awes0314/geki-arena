-- ユーザー行動ログ・エラーログ。書き込みはService Roleのみ、参照は運営のみ。
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  event_type text not null check (
    event_type in (
      'login', 'login_failed', 'logout', 'register',
      'competition_create', 'one_v_one_create',
      'score_submit', 'score_submit_rejected', 'error'
    )
  ),
  level text not null default 'info' check (level in ('info', 'error')),
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index activity_logs_event_type_created_at_idx
  on public.activity_logs (event_type, created_at desc);
create index activity_logs_user_id_idx on public.activity_logs (user_id);

alter table public.activity_logs enable row level security;

revoke all on public.activity_logs from anon, authenticated;
grant select on public.activity_logs to authenticated;

create policy activity_logs_select_admin on public.activity_logs
  for select to authenticated using (public.is_admin());
