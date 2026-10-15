-- 大会機能: 書き込みはServer Action（Service Role）経由に限定し、直接書き込みによる検証回避を防ぐ。

-- 参加条件・離脱/取消ルールを回避できないよう、クライアントからの直接INSERT/UPDATEを撤去する
drop policy competition_participants_insert_own on public.competition_participants;
drop policy competition_participants_update_own on public.competition_participants;
drop policy competition_target_charts_insert_own on public.competition_target_charts;
drop policy competitions_insert_own on public.competitions;

-- 本人による大会の更新は説明のみ（competition.md「Competition Management」）
drop policy competitions_update_own on public.competitions;
revoke update on public.competitions from authenticated;
create policy competitions_update_own on public.competitions
  for update to authenticated
  using (organizer_id = (select auth.uid()) and deleted_at is null)
  with check (organizer_id = (select auth.uid()) and deleted_at is null);
grant update (description) on public.competitions to authenticated;

-- 削除済みの大会は主催者・運営のみ参照可能
drop policy competitions_select on public.competitions;
create policy competitions_select on public.competitions
  for select to authenticated
  using (deleted_at is null or organizer_id = (select auth.uid()) or public.is_admin());

-- 同一主催者の開催期間重複を同時リクエストでも防ぐ
create extension if not exists btree_gist;
alter table public.competitions
  add constraint competitions_organizer_period_no_overlap
  exclude using gist (organizer_id with =, tstzrange(start_at, end_at) with &&)
  where (deleted_at is null);
