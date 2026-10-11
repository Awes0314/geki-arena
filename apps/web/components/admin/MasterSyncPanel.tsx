"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type SyncSummary = { added: number; updated: number; deactivated: number };

type SyncState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "success"; summary: SyncSummary }
  | { status: "error"; message: string };

/** Pongekiから楽曲・譜面マスタを最新化する操作パネル。 */
export function MasterSyncPanel() {
  const [state, setState] = useState<SyncState>({ status: "idle" });

  async function handleSync() {
    setState({ status: "running" });
    try {
      const response = await fetch("/api/admin/pongeki-sync", { method: "POST" });
      const body = (await response.json()) as { data?: SyncSummary; error?: { message: string } };
      if (response.ok && body.data) {
        setState({ status: "success", summary: body.data });
      } else {
        setState({ status: "error", message: body.error?.message ?? "マスタの最新化に失敗しました。" });
      }
    } catch {
      setState({ status: "error", message: "通信に失敗しました。時間をおいて再度お試しください。" });
    }
  }

  const running = state.status === "running";

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-sm">Pongekiから楽曲・譜面マスタを取得し、当システムのデータを更新します。</p>
      <Button onClick={handleSync} disabled={running} aria-disabled={running}>
        {running ? "更新中..." : "マスタ最新化"}
      </Button>
      {state.status === "success" && (
        <Alert variant="success">
          最新化が完了しました（追加 {state.summary.added}件 / 更新 {state.summary.updated}件 / 無効化{" "}
          {state.summary.deactivated}件）
        </Alert>
      )}
      {state.status === "error" && <Alert variant="error">{state.message}</Alert>}
    </div>
  );
}
