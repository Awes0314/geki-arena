import type { ReactNode } from "react";

import { ChartDisplay } from "@/components/chart/ChartDisplay";
import { isCreatorTitleHidden } from "@/lib/one-v-one/list-filter";
import { formatMusicRange } from "@/lib/one-v-one/music-range";
import type { MatchChart, OneVOneListItem } from "@/lib/one-v-one/queries";

function Slot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-1 py-2 text-sm">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </li>
  );
}

function Chart({ chart, hideTitle }: { chart: MatchChart; hideTitle?: boolean }) {
  return (
    <ChartDisplay
      title={hideTitle ? "???" : chart.title}
      difficulty={chart.difficulty}
      level={chart.level}
      chartConstant={chart.chartConstant}
    />
  );
}

/** 対戦曲（作成者選曲・参加者選曲・ランダム選曲）。成立前は作成者以外には作成者選曲の楽曲名を伏せる。 */
export function MatchCharts({ match }: { match: OneVOneListItem }) {
  const hideCreatorTitle = isCreatorTitleHidden(match);
  const range = formatMusicRange(match.range);

  return (
    <ul className="flex flex-col divide-y divide-border">
      <Slot label="作成者選曲">
        {match.creatorChart ? <Chart chart={match.creatorChart} hideTitle={hideCreatorTitle} /> : <span className="text-muted">不明</span>}
      </Slot>
      <Slot label="参加者選曲">
        {match.opponentChart ? <Chart chart={match.opponentChart} /> : <span className="text-muted">参加者選曲（{range}）</span>}
      </Slot>
      <Slot label="ランダム選曲">
        {match.randomChart ? <Chart chart={match.randomChart} /> : <span className="text-muted">ランダム選曲（{range}）</span>}
      </Slot>
    </ul>
  );
}
