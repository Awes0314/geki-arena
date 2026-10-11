# Pongeki Sync

## Overview
- 楽曲・譜面マスタを、運営者が提供する別サービスPongekiから取り込む設計を定義する。要件は`requirements/musics_charts.md`を参照。

## Source
- PongekiはSupabaseで管理されており、APIでアクセスできる。
- 使用するテーブルは`public.CHARTS`のみである（楽曲単位のテーブルは存在しない）。
- `delete_flag = false`のレコードが有効である。
- 取得するカラム: `id` / `title` / `difficulty` / `level` / `chart_const` / `jacket_image_url` / `delete_flag`
- アーティスト名・ジャンルは取得できないため、当システムでは保持しない。

## Mapping
| Pongeki CHARTS | 当システム |
|---|---|
| `id` | `charts.pongeki_chart_id`（突合キー）。末尾の`_<難易度>_<level>`を除いた部分を`musics.id`とする |
| `title` | `musics.title` |
| `jacket_image_url` | `charts.jacket_image_url` |
| `difficulty` | `charts.difficulty_type` |
| `level` | `charts.level` |
| `chart_const` | `charts.chart_constant` |
| `delete_flag` | `charts.is_active`（`delete_flag = false`のとき`true`） |

- 譜面IDの例: `b7dd5ada0860f16876884e62a224d1aa_LUNATIC_0` / `b7dd5ada0860f16876884e62a224d1aa_LUNATIC_13plus`（同一楽曲のLUNATIC 2譜面。接頭部が同じものを同一楽曲とみなす）。
- 同一楽曲に属する譜面間で`title`が異なることはない。`jacket_image_url`は、同一楽曲でも譜面ごとに異なる場合がある（LUNATICのみ異なるものが多い）ため、譜面側で保持する。
- 値の形式: `difficulty`は`BASIC`/`MASTER`/`LUNATIC`などのtext、`level`は`13+`/`0`/`10`などのtext。譜面ID内の`13plus`は記号が使えないためPongeki側で`+`を変換したものであり、`level`カラムは`13+`である（譜面IDから`level`を復元せず、カラム値を使用する）。

## Sync Rules
- 運営者ページからの手動実行で、`pongeki_chart_id`をキーにupsertする。
- Pongeki側で`delete_flag = true`になった、またはPongekiに存在しなくなった譜面は、物理削除せず`is_active = false`とする（過去の提出が参照するため）。
- 同期処理はService Roleクライアントで行う。
- 同期の失敗はサーバーログに記録し、運営者に失敗を表示する。更新が失敗しても既存データは保持する。

## Notes
- Singularityの3楽曲は、オンゲキNET上の名称と異なり`Singularity - xx`形式の楽曲名とする（`ongeki-net.md`参照）。Pongeki側の`title`はすでにこの形式である。
