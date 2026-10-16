-- 開発用の仮データ（Supabase SQL Editorで手動実行。本番では実行しないこと）
-- ログイン: userId = dev_alice / dev_bob / dev_carol、パスワード = password123
-- 内部メールは {userId}@dev.geki-arena.internal（SUPABASE_AUTH_INTERNAL_EMAIL_DOMAIN と一致させる）

-- Rating区分マスタはマイグレーション(20261011120000)で登録済み

-- Supabase Auth ユーザー
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
   'dev_alice@dev.geki-arena.internal', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
   'dev_bob@dev.geki-arena.internal', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
   'dev_carol@dev.geki-arena.internal', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  u.id, u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333'
)
on conflict do nothing;

-- アプリのユーザー（user_no は自動採番、recovery_code_hash はダミー）
insert into public.users (
  id, user_id, display_name, icon_url, bio, sns_links, rating_class_id, role, status, recovery_code_hash
) values
  ('11111111-1111-4111-8111-111111111111', 'dev_alice', 'アリス', null,
   E'開発用の仮ユーザーです。\n複数行の自己紹介の表示確認用。',
   '[{"type":"x","value":"example"},{"type":"discord","value":"alice_dev"},{"type":"other","value":"https://example.com"}]',
   3, 'admin', 'active', 'dummy-hash'),
  ('22222222-2222-4222-8222-222222222222', 'dev_bob', 'ボブ', null,
   null, '[]', 1, 'general', 'active', 'dummy-hash'),
  ('33333333-3333-4333-8333-333333333333', 'dev_carol', 'キャロル（停止中）', null,
   '停止状態のログイン拒否確認用。', '[]', null, 'general', 'suspended', 'dummy-hash')
on conflict (id) do nothing;

-- コース・バッジ・クリア結果（バッジ選択UIの確認用）
-- courses.reward_badge_id と course_badges.course_id は相互参照のため、同一トランザクションで投入する
begin;
  insert into public.courses (id, chapter, course_name, clear_condition, reward_badge_id) values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '1', 'はじめてのコース', '{}', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '1', 'ステップアップコース', '{}', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
  on conflict (id) do nothing;

  insert into public.course_badges (id, course_id, badge_chapter) values
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '1'),
    ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'alpha')
  on conflict (id) do nothing;
commit;

-- アリスが両コースをクリア済みの状態にする（latest_submission_id が必須のため提出データも仮作成）
insert into public.score_submissions (id, submitter_id, context_type, context_id, total_score, validation_status) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', 'course',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3000000, 'valid'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', '11111111-1111-4111-8111-111111111111', 'course',
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 3000000, 'valid')
on conflict (id) do nothing;

insert into public.course_challenge_results (course_id, user_id, latest_submission_id, result, achieved_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cleared', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'cleared', now())
on conflict (course_id, user_id) do nothing;
