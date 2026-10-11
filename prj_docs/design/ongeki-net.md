# Ongeki NET

## Overview
- オンゲキNET（https://ongeki-net.com/ongeki-mobile/）のスコア取得に必要な、ページ構造と解釈ルールを定義する。
- 当システムのサーバーからは直接アクセスしない。ユーザーのブラウザ上でブックマークレットがアクセスする（`bookmarklet.md`参照）。
- オンゲキNET側の仕様変更で取得ロジックが影響を受ける可能性がある（`operations/external-service.md`参照）。

## Pages
| ページ | URL | 備考 |
|---|---|---|
| ログイン | `/ongeki-mobile/` | 未ログイン。 |
| Aime選択 | `/ongeki-mobile/aimeList/` | 未ログイン（ログイン済みとはみなさない）。 |
| プレイ履歴一覧 | `/ongeki-mobile/record/playlog/` | 最大50件、プレイ日時の降順。 |
| プレイ履歴詳細 | `/ongeki-mobile/record/playlogDetail/?idx=<idx>` | `idx`は一覧の各履歴から取得する。 |

## Playlog List
- `div.m_10`が1件のプレイ履歴に対応する。
- 各要素の取得元:

| 属性 | 取得元 | 加工 |
|---|---|---|
| 難易度 | `div.m_10`直下の先頭`img`の`src`のファイル名 | `diff_basic.png`/`diff_advanced.png`/`diff_expert.png`/`diff_master.png`/`diff_lunatic.png`を`DifficultyType`に変換 |
| プレイ日時 | `span.f_r.f_12.h_10` | `YYYY/MM/DD HH:mm`をJSTとして解釈し、ISO 8601（`+09:00`）に変換 |
| 楽曲名 | `div.m_5.l_h_10.break` | 前後の空白を除去 |
| ジャケット画像URL | `img.m_5.f_l`の`src` | そのまま |
| テクニカルスコア | `td[class^='technical_score_block'] .f_20`（記録更新時は`technical_score_block_new`になるため前方一致で取得する） | 3桁区切りのカンマを除去し整数化 |
| idx | `form input[name="idx"]`の`value` | 詳細ページ取得に使用 |

- 一覧にはBATTLE SCORE、OVER DAMAGE等も表示されるが、収集しない（`domain/ongeki.md`参照）。

## Playlog Detail
- 一覧と同じ情報を持つ`div.m_10`（`.playlog_score_block`を含むもの）と、詳細独自の判定情報を持つ`div.m_10.t_r.f_12`で構成される。
- 一覧と同じ属性は一覧と同様に取得し、詳細独自の属性は`div.m_10.t_r.f_12`内の`table.score_detail_table`（左側）から取得する。

| 属性 | 取得元 | 加工 |
|---|---|---|
| 最大コンボ数 | 先頭行（`th`内の`img`が`score_max_combo.png`）の`td` | カンマ除去 |
| CRITICAL BREAK数 | `tr.score_critical_break td` | カンマ除去 |
| BREAK数 | `tr.score_break td` | カンマ除去 |
| HIT数 | `tr.score_hit td` | カンマ除去 |
| MISS数 | `tr.score_miss td` | カンマ除去 |
| BELL数 | `tr.score_bell td` | `取得数/総数`形式のまま扱う（各数値のカンマ除去） |
| DAMAGE数 | `tr.score_damage td` | カンマ除去 |

- 右側の`table.score_detail_table`（TAP/HOLD/FLICK/SIDE TAP/SIDE HOLD）は収集しない。

## Special Charts
オンゲキNET上では楽曲名のみでは譜面を一意に特定できない楽曲が存在する。

### Singularity
- 楽曲名`Singularity`はオンゲキ内に3種類存在し、ジャケット画像URLで判別する。
- システム内（表示・マスタデータ）では`Singularity - xx`の形式の楽曲名とする。

| ジャケット画像URL | 楽曲名 |
|---|---|
| https://ongeki-net.com/ongeki-mobile/img/music/9cc53da5e1896b30.png | Singularity - ETIA.「Arcaea」 |
| https://ongeki-net.com/ongeki-mobile/img/music/19bdf34c7aed1ee0.png | Singularity - SEGA SOUND STAFF「セガNET麻雀 MJ」 |
| https://ongeki-net.com/ongeki-mobile/img/music/ac5cab7a8a61d825.png | Singularity - technoplanet |

- プレイ履歴一覧・詳細のどちらにもジャケットが表示されるため、一覧の情報のみで判別できる。

### Perfect Shining!!（LUNATIC）
- 楽曲名`Perfect Shining!!`のLUNATICには、レベル表示が0のものと13+のものの2譜面が存在する（Pongekiの譜面ID末尾は`_LUNATIC_0`と`_LUNATIC_13plus`、同一楽曲IDを共有する）。
- 楽曲名は両者とも`Perfect Shining!!`であり、名称の置換は行わない。
- プレイ履歴にレベルは表示されず、楽曲名・難易度だけでは判別できないが、ジャケット画像URLがレベルごとに異なるため、一覧の情報のみで判別できる。

| レベル | ジャケット画像URL |
|---|---|
| 0 | https://ongeki-net.com/ongeki-mobile/img/music/bacbd6ad4f2f6df4.png |
| 13+ | https://ongeki-net.com/ongeki-mobile/img/music/20a6638745f28c48.png |

- 判別は当システムの譜面マスタの`charts.jacket_image_url`との突合による（一般化した判別ルールは「Chart Matching」参照）。

### Chart Matching
1. 楽曲名（SingularityはジャケットURLから置換した名称）と難易度で、有効な譜面（`is_active = true`）を絞る。
2. 候補が1件ならそれを採用する。
3. 候補が複数ある場合（Perfect Shining!! のLUNATIC）は、ジャケット画像URLが`charts.jacket_image_url`と一致するものを採用する。
4. 一意に絞れない場合は照合失敗とする。

- 詳細ページの情報（BELL総数、総ノーツ数）は譜面判別に使用しない。

### 上記以外
- 上記以外の楽曲は、楽曲名と難易度で譜面を特定できるものとして扱う（オンゲキNETにレベルは表示されない）。
- 当システムでの表示は、楽曲名・難易度・レベルを常にセットとする。
