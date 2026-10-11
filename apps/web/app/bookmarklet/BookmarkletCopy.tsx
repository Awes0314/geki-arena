"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/** ブックマークレット用スクリプトを生成しコピーさせる。ロジック本体は当システムでホストする。 */
export function BookmarkletCopy() {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  function buildScript(): string {
    const src = `${window.location.origin}/bookmarklet.js`;
    return `javascript:(function(){var s=document.createElement('script');s.src='${src}?t='+Date.now();document.body.appendChild(s);})();`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildScript());
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={copy}>ブックマークレットをコピー</Button>
      {copied === "done" && <Alert variant="success">コピーしました。</Alert>}
      {copied === "failed" && <Alert variant="error">コピーに失敗しました。ブラウザの設定を確認してください。</Alert>}
    </div>
  );
}
