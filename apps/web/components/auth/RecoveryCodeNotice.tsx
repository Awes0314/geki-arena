"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { buttonStyles } from "@/components/ui/Button";

type NoticeLink = { href: string; label: string };

type RecoveryCodeNoticeProps = {
  code: string;
  title: string;
  /** 保存確認のチェック後に押せるようになる */
  primary: NoticeLink;
  secondary?: NoticeLink;
};

/** リカバリーコードを1度だけ表示し、保存したことの確認後に次へ進ませる。 */
export function RecoveryCodeNotice({ code, title, primary, secondary }: RecoveryCodeNoticeProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Alert variant="info">
        パスワードを忘れた場合に必要なリカバリーコードです。この画面を閉じると再表示できません。必ず控えてください。
      </Alert>
      <p
        aria-label="リカバリーコード"
        className="select-all rounded-lg border border-border bg-foreground/5 px-3 py-4 text-center font-mono text-xl tracking-wider"
      >
        {code}
      </p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        リカバリーコードを保存しました
      </label>
      {confirmed ? (
        <Link href={primary.href} className={buttonStyles("primary")}>
          {primary.label}
        </Link>
      ) : (
        <button type="button" disabled className={buttonStyles("primary")}>
          {primary.label}
        </button>
      )}
      {confirmed && secondary && (
        <Link href={secondary.href} className={buttonStyles("ghost")}>
          {secondary.label}
        </Link>
      )}
    </div>
  );
}
