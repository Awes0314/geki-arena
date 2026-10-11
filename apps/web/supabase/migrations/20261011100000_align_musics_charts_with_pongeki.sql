-- Pongeki同期（prj_docs/design/pongeki-sync.md, database.md）に合わせて musics / charts を修正する。
-- 既存の musics / charts 行がある場合は pongeki_chart_id を設定できないため、事前にデータを空にすること。

alter table public.musics
  drop column artist,
  drop column genre,
  drop column jacket_image_url;

alter table public.charts
  add column pongeki_chart_id text not null unique,
  add column jacket_image_url text,
  add column is_active boolean not null default true;

alter table public.charts drop constraint charts_music_id_difficulty_type_key;
alter table public.charts
  add constraint charts_music_id_difficulty_type_level_key unique (music_id, difficulty_type, level);
