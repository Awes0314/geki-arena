import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MatchCard } from "@/components/one-v-one/MatchCard";
import { MatchSearch } from "@/components/one-v-one/MatchSearch";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/current-user";
import { filterMatches } from "@/lib/one-v-one/list-filter";
import { listMatches, type MatchListTab } from "@/lib/one-v-one/queries";

export const metadata: Metadata = { title: "1v1一覧" };

const TABS: Array<{ tab: MatchListTab; label: string; href: string }> = [
  { tab: "recruiting", label: "募集中", href: "/one-v-one" },
  { tab: "mine", label: "自分の対戦", href: "/one-v-one?tab=mine" },
];

async function MatchList({ searchParams }: { searchParams: PageProps<"/one-v-one">["searchParams"] }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const tab: MatchListTab = params.tab === "mine" ? "mine" : "recruiting";
  const matches = filterMatches(
    await listMatches({ tab, viewerId: user.id }),
    typeof params.q === "string" ? params.q : "",
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="表示切替" className="flex gap-2">
          {TABS.map((item) => (
            <Link
              key={item.tab}
              href={item.href}
              aria-current={item.tab === tab ? "page" : undefined}
              className={buttonStyles(item.tab === tab ? "primary" : "secondary")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <MatchSearch />
      </div>
      {matches.length === 0 ? (
        <Card>
          <p className="text-sm">該当する1v1はありません。</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((match) => (
            <li key={match.id}>
              <MatchCard match={match} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function OneVOnePage({ searchParams }: PageProps<"/one-v-one">) {
  return (
    <PageContainer>
      <PageHeader
        title="1v1"
        tone="one-v-one"
        actions={
          <Link href="/one-v-one/new" className={buttonStyles("primary")}>
            1v1を作成
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <MatchList searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
