import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ChartDisplay } from "@/components/chart/ChartDisplay";
import { CompetitionStatusBadge } from "@/components/competition/CompetitionStatusBadge";
import { CompetitionFilters } from "@/components/competition/CompetitionFilters";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RatingRangeText } from "@/components/user/RatingRangeText";
import { UserDisplay } from "@/components/user/UserDisplay";
import { requireUser } from "@/lib/auth/current-user";
import { levelToNumber } from "@/lib/competition/level";
import { filterCompetitions } from "@/lib/competition/list-filter";
import { formatJstDateTime } from "@/lib/competition/period";
import { getRatingClassOptions, listCompetitions, type CompetitionListItem } from "@/lib/competition/queries";
import { getProfileByUserNo } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "大会一覧" };

const CARD_CHART_LIMIT = 3;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** カード右上のたすき掛け表示。主催と参加が両立する場合は主催を優先する。 */
function RelationRibbon({ competition }: { competition: CompetitionListItem }) {
  if (!competition.isOrganizer && !competition.isParticipant) return null;
  const organizer = competition.isOrganizer;
  return (
    <span
      className={`absolute right-[-34px] top-5 w-32 rotate-45 py-1 text-center text-xs font-bold text-white shadow-sm ${
        organizer ? "bg-orange-600" : "bg-blue-600"
      }`}
    >
      {organizer ? "主催" : "参加中"}
    </span>
  );
}

function CompetitionCard({ competition }: { competition: CompetitionListItem }) {
  const { ratingMin, ratingMax, targetCharts } = competition;
  const hiddenCount = targetCharts.length - CARD_CHART_LIMIT;
  const hasRelation = competition.isOrganizer || competition.isParticipant;

  return (
    <Card className="relative flex flex-col gap-3 overflow-hidden border-t-4 border-t-mode-competition">
      <RelationRibbon competition={competition} />
      <h2 className={`text-base font-semibold ${hasRelation ? "pr-12" : ""}`}>
        <Link
          href={`/competitions/${competition.id}`}
          className="underline-offset-2 after:absolute after:inset-0 after:content-[''] hover:underline"
        >
          {competition.name}
        </Link>
      </h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <CompetitionStatusBadge status={competition.status} />
        <span className="text-sm text-muted">
          {formatJstDateTime(competition.startAt)} 〜 {formatJstDateTime(competition.endAt)}
        </span>
      </div>
      {competition.description && <p className="line-clamp-2 whitespace-pre-wrap text-sm">{competition.description}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">参加条件:</span>
        <RatingRangeText min={ratingMin} max={ratingMax} />
      </div>
      <span className="inline-flex w-fit items-center rounded-full border border-foreground/40 px-2.5 py-0.5 text-xs font-semibold">
        {competition.continuousPlayRequired ? "全曲通し限定" : "各曲個別提出OK"}
      </span>
      <hr className="border-border" />
      <ul className="flex flex-col gap-1">
        {targetCharts.slice(0, CARD_CHART_LIMIT).map((chart) => (
          <li key={chart.chartId}>
            <ChartDisplay
              title={chart.title}
              difficulty={chart.difficulty}
              level={chart.level}
              chartConstant={chart.chartConstant}
            />
          </li>
        ))}
        {hiddenCount > 0 && <li className="text-xs text-muted">他{hiddenCount}曲</li>}
      </ul>
      <hr className="border-border" />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
        {competition.organizer ? (
          <span className="relative z-10">
            <UserDisplay {...competition.organizer} size="sm" />
          </span>
        ) : (
          <span />
        )}
        <span>{competition.participantCount}人 参加中</span>
      </div>
    </Card>
  );
}

async function FilterSection() {
  const user = await requireUser();
  const [profile, ratingClasses] = await Promise.all([getProfileByUserNo(user.user_no), getRatingClassOptions()]);
  const canFilterEligible = ratingClasses.some((rating) => rating.id === profile?.ratingClassId);
  return <CompetitionFilters canFilterEligible={canFilterEligible} />;
}

async function CompetitionList({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const status = single(params.status) === "finished" ? "finished" : "active";
  const query = single(params.q);
  const levelMin = single(params.levelMin);
  const levelMax = single(params.levelMax);
  const eligibleOnly = single(params.eligible) === "1";

  const [profile, ratingClasses, competitions] = await Promise.all([
    getProfileByUserNo(user.user_no),
    getRatingClassOptions(),
    listCompetitions({ status, viewerId: user.id }),
  ]);
  const viewerRatingOrder = ratingClasses.find((rating) => rating.id === profile?.ratingClassId)?.sortOrder ?? null;

  const filtered = filterCompetitions(competitions, {
    query,
    levelMin: levelMin === "" ? null : levelToNumber(levelMin),
    levelMax: levelMax === "" ? null : levelToNumber(levelMax),
    eligibleOnly,
    viewerRatingOrder,
  });
  return (
    <>
      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm">該当する大会はありません。</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((competition) => (
            <li key={competition.id}>
              <CompetitionCard competition={competition} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function CompetitionsPage({ searchParams }: PageProps<"/competitions">) {
  return (
    <PageContainer>
      <PageHeader
        title="大会"
        tone="competition"
        actions={
          <Link href="/competitions/new" className={buttonStyles("primary")}>
            大会を作成
          </Link>
        }
      />
      <Suspense fallback={<div className="mb-4 h-32" aria-hidden="true" />}>
        <FilterSection />
      </Suspense>
      <Suspense fallback={<Card className="h-40 animate-pulse" aria-hidden="true" />}>
        <CompetitionList searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
