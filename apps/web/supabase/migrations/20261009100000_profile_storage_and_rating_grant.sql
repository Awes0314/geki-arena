-- プロフィール機能: Rating区分は自己申告のため本人が更新可能にする（user.md「Editing Profile」）
grant update (rating_class_id) on public.users to authenticated;

-- アイコン画像用の公開バケット（2MB・png/jpeg/webp）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- 自身のフォルダ（{auth.uid()}/）配下のみ書き込み・削除可能。参照は公開バケットのため不要
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
