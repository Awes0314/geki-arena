-- user_no を 10000〜99999 のランダムかつ一意な値にする（連番のidentityを廃止）

create function public.generate_user_no()
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  candidate bigint;
  attempts integer := 0;
begin
  -- 同時登録で同じ値を採番しないよう、トランザクション終了まで直列化する
  perform pg_advisory_xact_lock(hashtext('public.users.user_no'));
  loop
    candidate := 10000 + floor(random() * 90000)::bigint;
    -- 削除済みユーザーの行も残るため、削除後の再割当ては発生しない
    exit when not exists (select 1 from public.users where user_no = candidate);
    attempts := attempts + 1;
    if attempts >= 1000 then
      raise exception 'user_no space is exhausted';
    end if;
  end loop;
  return candidate;
end;
$$;

alter table public.users alter column user_no drop identity;
alter table public.users alter column user_no set default public.generate_user_no();

-- 既存の連番ユーザーを範囲内の値へ振り直す
update public.users set user_no = public.generate_user_no() where user_no < 10000;

alter table public.users
  add constraint users_user_no_range check (user_no between 10000 and 99999);
