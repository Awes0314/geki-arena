"use client";

import { useState } from "react";

import { SelectInput, TextInput } from "@/components/ui/Fields";
import { LEVEL_OPTIONS } from "@/lib/competition/level";
import {
  CHART_CONSTANT_MAX,
  CHART_CONSTANT_MIN,
  isMusicRangeType,
  type MusicRangeType,
} from "@/lib/one-v-one/music-range";

type MusicRangeFieldsProps = {
  defaultType?: string;
  defaultMin?: string;
  defaultMax?: string;
  errors: { rangeType?: string; rangeMin?: string; rangeMax?: string };
};

/** レベル範囲または譜面定数範囲のいずれか一方を指定する入力。rangeType / rangeMin / rangeMax として送信する。 */
export function MusicRangeFields({ defaultType, defaultMin, defaultMax, errors }: MusicRangeFieldsProps) {
  const initialType = defaultType ?? null;
  const [type, setType] = useState<MusicRangeType>(isMusicRangeType(initialType) ? initialType : "level");

  return (
    <div className="flex flex-col gap-4">
      <SelectInput
        label="範囲の種別"
        name="rangeType"
        value={type}
        onChange={(event) => setType(event.target.value === "chart_constant" ? "chart_constant" : "level")}
        error={errors.rangeType}
      >
        <option value="level">レベル</option>
        <option value="chart_constant">譜面定数</option>
      </SelectInput>
      <div className="grid grid-cols-2 gap-3">
        {type === "level" ? (
          <>
            <SelectInput label="下限" name="rangeMin" required defaultValue={defaultMin ?? ""} error={errors.rangeMin}>
              <option value="">選択してください</option>
              {LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  Lv.{level}
                </option>
              ))}
            </SelectInput>
            <SelectInput label="上限" name="rangeMax" required defaultValue={defaultMax ?? ""} error={errors.rangeMax}>
              <option value="">選択してください</option>
              {LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  Lv.{level}
                </option>
              ))}
            </SelectInput>
          </>
        ) : (
          <>
            <TextInput
              label="下限"
              name="rangeMin"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={CHART_CONSTANT_MIN}
              max={CHART_CONSTANT_MAX}
              required
              defaultValue={defaultMin}
              error={errors.rangeMin}
            />
            <TextInput
              label="上限"
              name="rangeMax"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={CHART_CONSTANT_MIN}
              max={CHART_CONSTANT_MAX}
              required
              defaultValue={defaultMax}
              error={errors.rangeMax}
            />
          </>
        )}
      </div>
    </div>
  );
}
