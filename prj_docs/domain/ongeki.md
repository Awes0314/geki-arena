# Ongeki Score System

## Purpose
- オンゲキ本体のスコア・判定の仕様を、当システムが扱う範囲で定義する。オンゲキNETの画面構造は`design/ongeki-net.md`を参照。

## Technical Score
- オンゲキのスコアは「テクニカルスコア」（`technicalScore`）であり、全曲共通で満点は1,010,000点である。
- 満点（通称「理論値」）は、全ノートをCRITICAL BREAKで叩き、全BELLを取得し、DAMAGEを一度も受けない場合に達成される。
- 当システムのスコア比較・ランキングは、テクニカルスコアのみを対象とする。

## Judgements
| 判定 | 内容 |
|---|---|
| CRITICAL BREAK | ノートを完璧に叩いた判定。 |
| BREAK | ノートを叩いたが、CRITICAL BREAKには届かなかった判定。 |
| HIT | ノートを叩いたが、BREAKには届かなかった判定。 |
| MISS | ノートを叩けなかった判定（コンボが途切れる）。 |
| BELL | レーン上のベルの取得数。出現数は楽曲（譜面）ごとに異なる。`取得数/総数`の形式で表される。 |
| DAMAGE | ダメージを受けた回数。1回受けるごとにテクニカルスコアが10減少する。 |

## Notes for This System
- 当システムが収集する属性は`requirements/score.md`のScore Attributesに限る。BATTLE SCORE、OVER DAMAGE、ランク表示、FULL BELL/FULL COMBO/ALL BREAK等のクリアランプ、TAP/HOLD/FLICK等の個別達成率は収集しない。
- 総ノーツ数は`CRITICAL BREAK + BREAK + HIT + MISS`で求められる（譜面の同定に使用する場合は`design/ongeki-net.md`参照。要検証）。
