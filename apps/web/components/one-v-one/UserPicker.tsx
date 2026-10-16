"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Fields";
import { UserDisplay } from "@/components/user/UserDisplay";
import { searchUsers, type UserSearchResult } from "@/lib/one-v-one/user-search";

const SEARCH_DEBOUNCE_MS = 300;

type UserPickerProps = {
  name: string;
  label: string;
  error?: string;
};

/** ユーザーIDまたは表示名で検索してユーザーを1人選択する。選択結果はnameの隠し項目（ユーザーのid）として送信する。 */
export function UserPicker({ name, label, error }: UserPickerProps) {
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    if (query.trim() === "") return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await searchUsers(query);
        if (id !== requestId.current) return;
        if (result.ok) {
          setResults(result.data);
          setSearchError(null);
        } else {
          setSearchError(result.error.message);
        }
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">
        {label}
        <span aria-hidden="true" className="ml-1 text-red-600">
          *
        </span>
      </legend>
      <input type="hidden" name={name} value={selected?.id ?? ""} />

      {selected ? (
        <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <span className="flex-1">
            <UserDisplay
              userNo={selected.userNo}
              displayName={selected.displayName}
              iconUrl={selected.iconUrl}
              linked={false}
            />
          </span>
          <Button variant="ghost" aria-label="対戦相手の指定を解除" onClick={() => setSelected(null)}>
            ✕
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">対戦相手が選択されていません。</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <TextInput
          label="ユーザーIDまたは表示名で検索"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim() === "") setResults(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          maxLength={50}
        />
        {pending && <p className="text-xs text-muted">検索中...</p>}
        {searchError && <Alert variant="error">{searchError}</Alert>}
        {results && results.length === 0 && <p className="text-sm text-muted">該当するユーザーがいません。</p>}
        {results && results.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {results.map((candidate) => (
              <li key={candidate.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <UserDisplay
                    userNo={candidate.userNo}
                    displayName={candidate.displayName}
                    iconUrl={candidate.iconUrl}
                    linked={false}
                  />
                  <span className="shrink-0 text-xs text-muted">@{candidate.userId}</span>
                </span>
                <Button
                  variant="secondary"
                  disabled={selected?.id === candidate.id}
                  onClick={() => {
                    setSelected(candidate);
                    setQuery("");
                    setResults(null);
                  }}
                >
                  選択
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
