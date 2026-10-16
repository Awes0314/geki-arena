"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { CompetitionSubmitPanel } from "./CompetitionSubmitPanel";
import { CourseSubmitPanel } from "./CourseSubmitPanel";
import { MatchSubmitPanel } from "./MatchSubmitPanel";
import { SelectInput } from "@/components/ui/Fields";
import { resolvePlayLevels, type PlayLevels } from "@/lib/score-submission/actions";
import {
  ONGEKI_NET_ORIGIN,
  parseBookmarkletPayload,
  type BookmarkletPayload,
} from "@/lib/score-submission/schema";

type ReceiveState =
  | { status: "waiting" }
  | { status: "invalid" }
  | { status: "received"; payload: BookmarkletPayload; levels: PlayLevels | null };

const MODE_LABELS = { tournament: "大会・1v1", course: "コース" } as const;

/** ブックマークレットからpostMessageで送られたスコアを受信し、提出内容を表示する。 */
export function ScoreReceiver() {
  const [state, setState] = useState<ReceiveState>({ status: "waiting" });
  const [target, setTarget] = useState<"competition" | "one_v_one">("competition");

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== ONGEKI_NET_ORIGIN) return;
      const payload = parseBookmarkletPayload(event.data);
      if (!payload) {
        setState({ status: "invalid" });
        return;
      }
      setState({ status: "received", payload, levels: null });
      void resolvePlayLevels(payload).then((result) => {
        if (result.ok) setState({ status: "received", payload, levels: result.data });
      });
    }
    window.addEventListener("message", onMessage);
    window.opener?.postMessage({ type: "geki-arena:ready" }, ONGEKI_NET_ORIGIN);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (state.status === "waiting") {
    return (
      <Alert variant="info">
        データを受信しています。受信できない場合は、オンゲキNETでブックマークレットを再実行してください。
      </Alert>
    );
  }

  if (state.status === "invalid") {
    return (
      <Alert variant="error">
        受信したデータの形式が不正です。ブックマークレットを最新のものに更新し、再実行してください。
      </Alert>
    );
  }

  const { payload, levels } = state;
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">提出種別: {MODE_LABELS[payload.mode]}</h2>
        {payload.plays.length === 0 ? (
          <p className="text-sm">対象のプレイ履歴がありません。</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {payload.plays.map((play) => (
              <li key={play.idx} className="flex flex-col gap-1 py-2 text-sm">
                <span className="font-medium">{play.title}</span>
                <span className="text-foreground/70">
                  {play.difficulty}
                  {levels && ` Lv.${levels[play.idx] ?? "不明"}`} / {play.playDateTime.slice(0, 16).replace("T", " ")} /{" "}
                  {play.technicalScore.toLocaleString("ja-JP")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {payload.mode === "tournament" ? (
        <>
          <SelectInput
            label="提出先の種別"
            value={target}
            onChange={(event) => setTarget(event.target.value === "one_v_one" ? "one_v_one" : "competition")}
          >
            <option value="competition">大会</option>
            <option value="one_v_one">1v1</option>
          </SelectInput>
          {target === "competition" ? (
            <CompetitionSubmitPanel payload={payload} />
          ) : (
            <MatchSubmitPanel payload={payload} />
          )}
        </>
      ) : (
        <CourseSubmitPanel payload={payload} />
      )}
    </div>
  );
}
