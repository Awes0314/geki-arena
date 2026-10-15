const DIFFICULTY_CLASS: Record<string, string> = {
  BASIC: "border-lime-500 bg-lime-400 text-black",
  ADVANCED: "border-yellow-500 bg-yellow-300 text-black",
  EXPERT: "border-pink-500 bg-pink-400 text-black",
  MASTER: "border-purple-500 bg-purple-600 text-white",
  LUNATIC: "border-zinc-300 bg-black text-white ring-1 ring-white/60",
};

const FALLBACK_CLASS = "border-border bg-foreground/10 text-foreground";

/** 難易度バッジ。オンゲキの難易度色を踏襲する。 */
export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-bold leading-none ${DIFFICULTY_CLASS[difficulty] ?? FALLBACK_CLASS}`}
    >
      {difficulty}
    </span>
  );
}

type ChartDisplayProps = {
  title: string;
  difficulty: string;
  level: string;
  chartConstant?: number | null;
};

/** 譜面を示す共通表示（楽曲名・難易度・レベル・譜面定数）。 */
export function ChartDisplay({ title, difficulty, level, chartConstant }: ChartDisplayProps) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <DifficultyBadge difficulty={difficulty} />
      <span className="text-xs text-muted inline-block w-16">
        Lv.{level}
        {chartConstant !== undefined && chartConstant !== null && ` (${chartConstant.toFixed(1)})`}
      </span>
      <span className="text-sm font-medium">{title}</span>
    </span>
  );
}
