"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { buttonStyles } from "@/components/ui/Button";

type IconPickerProps = {
  currentUrl: string | null;
  name: string;
  error?: string;
};

/** アイコン画像の選択。選択直後にプレビューへ反映し、ファイル名は表示しない。 */
export function IconPicker({ currentUrl, name, error }: IconPickerProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 送信後のフォームリセットでファイル入力が空になるため、プレビューも合わせて戻す
  useEffect(() => {
    const form = inputRef.current?.form;
    const handleReset = () => {
      setPreviewUrl(null);
      setRemoved(false);
    };
    form?.addEventListener("reset", handleReset);
    return () => form?.removeEventListener("reset", handleReset);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = removed ? null : (previewUrl ?? currentUrl);

  return (
    <div className="flex items-center gap-4">
      <Avatar src={displayUrl} name={name} size="lg" />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">アイコン画像</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            name="icon"
            accept="image/png,image/jpeg,image/webp"
            className="peer sr-only"
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreviewUrl(file ? URL.createObjectURL(file) : null);
              if (file) setRemoved(false);
            }}
          />
          <label
            htmlFor={inputId}
            className={`${buttonStyles("secondary")} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent`}
          >
            ファイルを選択
          </label>
          {currentUrl && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="removeIcon"
                className="size-4"
                checked={removed}
                onChange={(event) => setRemoved(event.target.checked)}
              />
              削除する
            </label>
          )}
        </div>
        <p className="text-xs text-muted">png / jpeg / webp、2MB以下</p>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
