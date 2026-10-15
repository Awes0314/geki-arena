"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { ChartDisplay } from "@/components/chart/ChartDisplay";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput } from "@/components/ui/Fields";
import { DIFFICULTY_TYPES } from "@/lib/admin/pongeki-mapping";
import { searchCharts, type ChartSearchResult } from "@/lib/competition/chart-search";
import { CHART_SEARCH_SORT_LABELS, CHART_SEARCH_SORTS, type ChartSearchSort } from "@/lib/competition/chart-sort";
import { MAX_TARGET_CHARTS, MIN_TARGET_CHARTS } from "@/lib/validation/competition";

const DIFFICULTIES = DIFFICULTY_TYPES;
const SEARCH_DEBOUNCE_MS = 300;

function toDifficulty(value: string): (typeof DIFFICULTIES)[number] | "" {
  return DIFFICULTIES.find((item) => item === value) ?? "";
}

function parseConstant(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type ChartPickerProps = { error?: string };

/** 課題曲（1〜10曲、順序あり）を検索・絞り込みで選択する。選択結果はchartIds(カンマ区切り)として送信する。 */
export function ChartPicker({ error }: ChartPickerProps) {
  const [selected, setSelected] = useState<ChartSearchResult[]>([]);
  const [results, setResults] = useState<ChartSearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<string>("MASTER");
  const [constantMin, setConstantMin] = useState("");
  const [constantMax, setConstantMax] = useState("");
  const [sort, setSort] = useState<ChartSearchSort>("title");
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  const selectedIds = new Set(selected.map((chart) => chart.chartId));
  const full = selected.length >= MAX_TARGET_CHARTS;

  // 条件が変わるたびに自動で検索する（楽曲名の入力中は少し待つ）
  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(
      () => {
        startTransition(async () => {
          const result = await searchCharts({
            query,
            difficulty: toDifficulty(difficulty),
            constantMin: parseConstant(constantMin),
            constantMax: parseConstant(constantMax),
            sort,
          });
          if (id !== requestId.current) return;
          if (result.ok) {
            setResults(result.data);
            setSearchError(null);
          } else {
            setSearchError(result.error.message);
          }
        });
      },
      query === "" ? 0 : SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [query, difficulty, constantMin, constantMax, sort]);

  function move(index: number, offset: number) {
    setSelected((current) => {
      const next = [...current];
      const target = index + offset;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-sm font-medium">
        課題曲<span aria-hidden="true" className="ml-1 text-red-600">*</span>
      </legend>
      <ul className="list-inside list-disc text-xs text-muted">
        <li>
          {MIN_TARGET_CHARTS}曲以上、{MAX_TARGET_CHARTS}曲以内
        </li>
        <li>同一譜面の重複指定は不可（同じ楽曲でも難易度・レベルが異なれば可）</li>
      </ul>
      <input type="hidden" name="chartIds" value={selected.map((chart) => chart.chartId).join(",")} />

      <div>
        <p className="mb-2 text-sm">
          選択中: {selected.length} / {MAX_TARGET_CHARTS}曲（並び順は表示順です。提出時のプレイ順は問いません）
        </p>
        {selected.length === 0 ? (
          <p className="text-sm text-muted">課題曲が選択されていません。</p>
        ) : (
          <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {selected.map((chart, index) => (
              <li key={chart.chartId} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-6 shrink-0 text-muted">{index + 1}.</span>
                <span className="flex-1">
                  <ChartDisplay
                    title={chart.title}
                    difficulty={chart.difficulty}
                    level={chart.level}
                    chartConstant={chart.chartConstant}
                  />
                </span>
                <Button variant="ghost" aria-label={`${chart.title}を上へ`} disabled={index === 0} onClick={() => move(index, -1)}>
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`${chart.title}を下へ`}
                  disabled={index === selected.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`${chart.title}を削除`}
                  onClick={() => setSelected((current) => current.filter((item) => item.chartId !== chart.chartId))}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ol>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <TextInput
          label="楽曲名で検索"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          maxLength={100}
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectInput label="難易度" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="">すべて</option>
            {DIFFICULTIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectInput>
          <SelectInput label="並び順" value={sort} onChange={(event) => setSort(event.target.value as ChartSearchSort)}>
            {CHART_SEARCH_SORTS.map((item) => (
              <option key={item} value={item}>
                {CHART_SEARCH_SORT_LABELS[item]}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="譜面定数（下限）"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="20"
            value={constantMin}
            onChange={(event) => setConstantMin(event.target.value)}
          />
          <TextInput
            label="譜面定数（上限）"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="20"
            value={constantMax}
            onChange={(event) => setConstantMax(event.target.value)}
          />
        </div>
        {pending && <p className="text-xs text-muted">検索中...</p>}

        {searchError && <Alert variant="error">{searchError}</Alert>}
        {results && results.length === 0 && <p className="text-sm text-muted">該当する譜面がありません。</p>}
        {results && results.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {results.map((chart) => {
              const added = selectedIds.has(chart.chartId);
              return (
                <li key={chart.chartId} className="flex items-center gap-2 py-2 text-sm">
                  <span className="flex-1">
                    <ChartDisplay
                      title={chart.title}
                      difficulty={chart.difficulty}
                      level={chart.level}
                      chartConstant={chart.chartConstant}
                    />
                  </span>
                  <Button
                    variant="secondary"
                    disabled={added || full}
                    onClick={() => setSelected((current) => [...current, chart])}
                  >
                    {added ? "追加済み" : "追加"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
