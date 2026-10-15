-- Rating区分に色・アイコンの系統キー(tier)を追加し、マスタを登録する
alter table public.rating_classes
  add column tier text not null default 'blue'
  check (tier in (
    'blue', 'green', 'orange', 'red', 'purple', 'bronze', 'silver', 'gold',
    'platinum', 'rainbow', 'rainbow_ex', 'rainbow_max'
  ));
alter table public.rating_classes alter column tier drop default;

-- 開発用の仮データ(id 1-3)も同じidで上書きする
insert into public.rating_classes (id, code, label, tier, sort_order) values
  (1,  'rating_0_000',  '0.000～3.999',   'blue',        1),
  (2,  'rating_4_000',  '4.000～6.999',   'green',       2),
  (3,  'rating_7_000',  '7.000～8.999',   'orange',      3),
  (4,  'rating_9_000',  '9.000～10.999',  'red',         4),
  (5,  'rating_11_000', '11.000～12.999', 'purple',      5),
  (6,  'rating_13_000', '13.000～14.999', 'bronze',      6),
  (7,  'rating_15_000', '15.000～16.999', 'silver',      7),
  (8,  'rating_17_000', '17.000～17.999', 'gold',        8),
  (9,  'rating_18_000', '18.000～18.999', 'platinum',    9),
  (10, 'rating_19_000', '19.000～19.499', 'rainbow',     10),
  (11, 'rating_19_500', '19.500～19.999', 'rainbow',     11),
  (12, 'rating_20_000', '20.000～20.249', 'rainbow',     12),
  (13, 'rating_20_250', '20.250～20.499', 'rainbow',     13),
  (14, 'rating_20_500', '20.500～20.749', 'rainbow',     14),
  (15, 'rating_20_750', '20.750～20.999', 'rainbow',     15),
  (16, 'rating_21_000', '21.000～21.249', 'rainbow_ex',  16),
  (17, 'rating_21_250', '21.250～21.499', 'rainbow_ex',  17),
  (18, 'rating_21_500', '21.500～21.749', 'rainbow_ex',  18),
  (19, 'rating_21_750', '21.750～21.999', 'rainbow_ex',  19),
  (20, 'rating_22_000', '22.000～22.099', 'rainbow_max', 20),
  (21, 'rating_22_100', '22.100～22.199', 'rainbow_max', 21),
  (22, 'rating_22_200', '22.200～22.299', 'rainbow_max', 22),
  (23, 'rating_22_300', '22.300～22.399', 'rainbow_max', 23),
  (24, 'rating_22_400', '22.400～22.499', 'rainbow_max', 24)
on conflict (id) do update
  set code = excluded.code, label = excluded.label, tier = excluded.tier, sort_order = excluded.sort_order;
