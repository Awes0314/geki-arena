-- 1v1機能: 書き込みはServer Action（Service Role）経由に限定し、挑戦/承認の検証回避を防ぐ。

drop policy one_v_one_matches_insert_own on public.one_v_one_matches;
drop policy one_v_one_matches_update_participant on public.one_v_one_matches;

-- 削除済みの対戦は作成者・運営のみ参照可能
drop policy one_v_one_matches_select on public.one_v_one_matches;
create policy one_v_one_matches_select on public.one_v_one_matches
  for select to authenticated
  using (deleted_at is null or creator_id = (select auth.uid()) or public.is_admin());

alter table public.one_v_one_matches
  add constraint one_v_one_matches_random_range_order check (random_range_min <= random_range_max),
  add constraint one_v_one_matches_opponent_range_order
    check (opponent_range_min is null or opponent_range_max is null or opponent_range_min <= opponent_range_max),
  add constraint one_v_one_matches_not_self check (opponent_user_id is null or opponent_user_id <> creator_id);
