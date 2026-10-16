import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { CompetitionStatusBadge } from "@/components/competition/CompetitionStatusBadge";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { OneVOneStatusBadge } from "@/components/one-v-one/OneVOneStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CourseBadge } from "@/components/user/CourseBadge";
import { RatingBadge } from "@/components/user/RatingBadge";
import { BADGE_CHAPTERS } from "@/lib/course-badge";
import { MODE_TONE_CLASS } from "@/lib/mode-tone";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "デザイン一覧" };

const COLOR_TOKENS = [
  { name: "background", variable: "--background" },
  { name: "foreground", variable: "--foreground" },
  { name: "surface", variable: "--surface" },
  { name: "border", variable: "--border" },
  { name: "muted", variable: "--muted" },
  { name: "accent", variable: "--accent" },
  { name: "accent-foreground", variable: "--accent-foreground" },
  { name: "mode-competition (大会)", variable: "--mode-competition" },
  { name: "mode-one-v-one (1v1)", variable: "--mode-one-v-one" },
  { name: "mode-course (コース)", variable: "--mode-course" },
  { name: "neon-from", variable: "--neon-from" },
  { name: "neon-to", variable: "--neon-to" },
] as const;

const BUTTON_VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];
const ALERT_VARIANTS = ["error", "warning", "success", "info"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

async function RatingBadges() {
  const { data, error } = await createAdminClient()
    .from("rating_classes")
    .select("id, label, tier, sort_order")
    .order("sort_order");
  if (error) {
    console.error("[adminDesign]", error.message);
    return <Alert variant="error">Rating区分の取得に失敗しました。</Alert>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {data.map((rating) => (
        <li key={rating.id} title={rating.tier}>
          <RatingBadge label={rating.label} tier={rating.tier} />
        </li>
      ))}
    </ul>
  );
}

export default function AdminDesignPage() {
  return (
    <PageContainer>
      <PageHeader title="デザイン一覧" />
      <div className="flex flex-col gap-4">
        <Section title="Rating区分バッジ">
          <Suspense fallback={<div className="h-8 animate-pulse rounded bg-foreground/5" aria-hidden="true" />}>
            <RatingBadges />
          </Suspense>
        </Section>

        <Section title="コースバッジ">
          <ul className="flex flex-wrap gap-4">
            {BADGE_CHAPTERS.map((chapter) => (
              <li key={chapter} className="flex flex-col items-center gap-1 text-xs">
                <CourseBadge badgeChapter={chapter} courseName="" size={56} />
                <span>{chapter}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="カラー(ライト/ダークは端末設定に追従)">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COLOR_TOKENS.map((token) => (
              <li key={token.variable} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 rounded border border-border"
                  style={{ background: `var(${token.variable})` }}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{token.name}</span>
                  <code className="text-foreground/70">{token.variable}</code>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-foreground/70">ネオンライン / ネオンテキスト</span>
            <span className="neon-line block w-40 rounded-full" />
            <span className="neon-text text-xl font-bold">Geki Arena</span>
          </div>
        </Section>

        <Section title="モードの差し色">
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(MODE_TONE_CLASS) as (keyof typeof MODE_TONE_CLASS)[]).map((tone) => (
              <div key={tone} className={`rounded-xl border border-border p-4 ${MODE_TONE_CLASS[tone].cardBorder}`}>
                <h3 className={`text-lg font-bold ${MODE_TONE_CLASS[tone].headingBorder}`}>
                  {tone === "competition" ? "大会" : "1v1"}
                </h3>
                <p className={`mt-2 text-sm ${MODE_TONE_CLASS[tone].text}`}>テキストの差し色</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="状態バッジ">
          <div className="flex flex-wrap gap-2">
            <CompetitionStatusBadge status="scheduled" />
            <CompetitionStatusBadge status="ongoing" />
            <CompetitionStatusBadge status="finished" />
          </div>
          <div className="flex flex-wrap gap-2">
            <OneVOneStatusBadge status="recruiting" />
            <OneVOneStatusBadge status="pending_acceptance" />
            <OneVOneStatusBadge status="established" />
            <OneVOneStatusBadge status="finished" />
            <OneVOneStatusBadge status="expired" />
          </div>
        </Section>

        <Section title="ボタン">
          <div className="flex flex-wrap gap-2">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
            <Button disabled>disabled</Button>
          </div>
        </Section>

        <Section title="アラート">
          <div className="flex flex-col gap-2">
            {ALERT_VARIANTS.map((variant) => (
              <Alert key={variant} variant={variant}>
                {variant}
              </Alert>
            ))}
          </div>
        </Section>

        <Section title="ファビコン">
          <Image src="/favicon.ico" alt="favicon" width={32} height={32} unoptimized />
        </Section>
      </div>
    </PageContainer>
  );
}
