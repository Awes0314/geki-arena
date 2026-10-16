-- コースのチャプターを数値(1〜99)または1文字の記号(α等)で扱えるよう、chapter_number(smallint)をchapter(text)へ置換する
alter table public.courses add column chapter text;
update public.courses set chapter = chapter_number::text;
alter table public.courses
  alter column chapter set not null,
  add constraint courses_chapter_check check (chapter ~ '^([1-9][0-9]?|[^0-9[:space:]])$'),
  drop column chapter_number;

-- courses.reward_badge_id と course_badges.course_id は相互参照のため、作成・削除は1トランザクションで行う（Service Roleのみ実行可）
create function public.admin_create_course(
  p_course_name text,
  p_chapter text,
  p_badge_chapter text,
  p_clear_condition jsonb,
  p_chart_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid := gen_random_uuid();
  v_badge_id uuid := gen_random_uuid();
begin
  insert into public.courses (id, chapter, course_name, clear_condition, reward_badge_id)
  values (v_course_id, p_chapter, p_course_name, p_clear_condition, v_badge_id);

  insert into public.course_badges (id, course_id, badge_chapter)
  values (v_badge_id, v_course_id, p_badge_chapter);

  insert into public.course_charts (course_id, order_index, chart_id)
  select v_course_id, (t.ordinality - 1)::smallint, t.chart_id
  from unnest(p_chart_ids) with ordinality as t(chart_id, ordinality);

  return v_course_id;
end;
$$;

-- 挑戦結果があるコースの譜面構成の変更は拒否する
create function public.admin_update_course(
  p_course_id uuid,
  p_course_name text,
  p_chapter text,
  p_badge_chapter text,
  p_clear_condition jsonb,
  p_chart_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current uuid[];
begin
  perform 1 from public.courses where id = p_course_id for update;
  if not found then
    raise exception 'course_not_found';
  end if;

  select coalesce(array_agg(chart_id order by order_index), '{}') into v_current
  from public.course_charts where course_id = p_course_id;

  if v_current is distinct from p_chart_ids then
    if exists (select 1 from public.course_challenge_results where course_id = p_course_id) then
      raise exception 'course_has_results';
    end if;
    delete from public.course_charts where course_id = p_course_id;
    insert into public.course_charts (course_id, order_index, chart_id)
    select p_course_id, (t.ordinality - 1)::smallint, t.chart_id
    from unnest(p_chart_ids) with ordinality as t(chart_id, ordinality);
  end if;

  update public.courses
  set course_name = p_course_name, chapter = p_chapter, clear_condition = p_clear_condition
  where id = p_course_id;

  update public.course_badges set badge_chapter = p_badge_chapter where course_id = p_course_id;
end;
$$;

-- 挑戦結果が1件もないコースのみ削除できる
create function public.admin_delete_course(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_badge_id uuid;
begin
  perform 1 from public.courses where id = p_course_id for update;
  if not found then
    raise exception 'course_not_found';
  end if;
  if exists (select 1 from public.course_challenge_results where course_id = p_course_id) then
    raise exception 'course_has_results';
  end if;

  select id into v_badge_id from public.course_badges where course_id = p_course_id;
  update public.users set displayed_badge_id = null where displayed_badge_id = v_badge_id;
  delete from public.course_charts where course_id = p_course_id;
  delete from public.course_badges where course_id = p_course_id;
  delete from public.courses where id = p_course_id;
end;
$$;

revoke all on function public.admin_create_course(text, text, text, jsonb, uuid[]) from public, anon, authenticated;
revoke all on function public.admin_update_course(uuid, text, text, text, jsonb, uuid[]) from public, anon, authenticated;
revoke all on function public.admin_delete_course(uuid) from public, anon, authenticated;
grant execute on function public.admin_create_course(text, text, text, jsonb, uuid[]) to service_role;
grant execute on function public.admin_update_course(uuid, text, text, text, jsonb, uuid[]) to service_role;
grant execute on function public.admin_delete_course(uuid) to service_role;
