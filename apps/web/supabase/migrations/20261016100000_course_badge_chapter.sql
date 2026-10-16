-- コースバッジをSVG URLからチャプター指定（アプリ側で描画）へ変更する
alter table public.course_badges
  add column badge_chapter text;

-- 既存データはCHAPTER番号（1〜9に丸め）で補完する
update public.course_badges b
set badge_chapter = least(greatest(c.chapter_number, 1), 9)::text
from public.courses c
where c.id = b.course_id;

alter table public.course_badges
  alter column badge_chapter set not null,
  add constraint course_badges_badge_chapter_check
    check (badge_chapter in ('1', '2', '3', '4', '5', '6', '7', '8', '9', 'alpha', 'beta', 'gamma')),
  drop column svg_asset_url;
