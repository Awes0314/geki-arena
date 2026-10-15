"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, failInternal, formDataToValues, ok, type FormState } from "@/lib/actions/result";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { getCompetitionStatus, type CompetitionStatus } from "@/lib/competition/period";
import { checkParticipationCondition } from "@/lib/competition/participation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { competitionDescriptionSchema, parseCompetitionForm } from "@/lib/validation/competition";

const OVERLAP_MESSAGE = "開催期間が、あなたが主催する他の大会と重複しています";
/** 期間重複は目立つ表示にするため、独立したキーで返す */
const OVERLAP_FIELD = "periodOverlap";
/** PostgresのEXCLUDE制約違反 */
const EXCLUSION_VIOLATION = "23P01";
const UNIQUE_VIOLATION = "23505";

type CompetitionRow = {
  id: string;
  organizer_id: string;
  start_at: string;
  end_at: string;
  participation_rating_min_id: number | null;
  participation_rating_max_id: number | null;
};

type Loaded = { competition: CompetitionRow; status: CompetitionStatus };

async function loadCompetition(competitionId: string): Promise<Loaded | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("competitions")
    .select("id, organizer_id, start_at, end_at, participation_rating_min_id, participation_rating_max_id")
    .eq("id", competitionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`failed to load competition: ${error.message}`);
  if (!data) return null;
  return { competition: data, status: getCompetitionStatus(data.start_at, data.end_at, new Date()) };
}

/** 自分が提出した件数。離脱可否の判定に使う。 */
async function countMySubmissions(competitionId: string, userId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("score_submissions")
    .select("id", { count: "exact", head: true })
    .eq("context_type", "competition")
    .eq("context_id", competitionId)
    .eq("submitter_id", userId);
  if (error) throw new Error(`failed to count submissions: ${error.message}`);
  return count ?? 0;
}

async function countActiveParticipants(competitionId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("competition_participants")
    .select("user_id", { count: "exact", head: true })
    .eq("competition_id", competitionId)
    .is("withdrawn_at", null)
    .is("removed_at", null);
  if (error) throw new Error(`failed to count participants: ${error.message}`);
  return count ?? 0;
}

function revalidateCompetition(competitionId: string) {
  revalidatePath("/competitions");
  revalidatePath(`/competitions/${competitionId}`);
  revalidatePath(`/competitions/${competitionId}/manage`);
}

/** 大会を作成し、成功時は大会詳細へ遷移する。 */
export async function createCompetition(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const user = await getCurrentUser();
  if (!user) return { result: fail("UNAUTHENTICATED", "ログインが必要です"), values };

  const parsed = parseCompetitionForm(values, new Date());
  const validationFail = (fieldErrors: Record<string, string>): FormState => ({
    result: fail("VALIDATION_ERROR", "入力内容を確認してください", fieldErrors),
    values,
  });
  if (!parsed.ok) return validationFail(parsed.fieldErrors);
  const input = parsed.data;

  let competitionId: string;
  try {
    const admin = createAdminClient();

    const ratingIds = [input.ratingMinId, input.ratingMaxId].filter((id): id is number => id !== null);
    if (ratingIds.length > 0) {
      const { data: ratings, error } = await admin.from("rating_classes").select("id, sort_order").in("id", ratingIds);
      if (error) throw new Error(`failed to fetch rating classes: ${error.message}`);
      const orderOf = (id: number | null) => ratings.find((rating) => rating.id === id)?.sort_order ?? null;
      if (ratings.length !== new Set(ratingIds).size) {
        return validationFail({ ratingMinId: "存在しないRating区分です" });
      }
      const min = orderOf(input.ratingMinId);
      const max = orderOf(input.ratingMaxId);
      if (min !== null && max !== null && min > max) {
        return validationFail({ ratingMaxId: "上限は下限以上のRating区分を指定してください" });
      }
    }

    const { data: charts, error: chartError } = await admin
      .from("charts")
      .select("id")
      .eq("is_active", true)
      .in("id", input.chartIds);
    if (chartError) throw new Error(`failed to fetch charts: ${chartError.message}`);
    if (charts.length !== input.chartIds.length) {
      return validationFail({ chartIds: "選択できない譜面が含まれています" });
    }

    const { count: overlapCount, error: overlapError } = await admin
      .from("competitions")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", user.id)
      .is("deleted_at", null)
      .lt("start_at", input.endAt.toISOString())
      .gt("end_at", input.startAt.toISOString());
    if (overlapError) throw new Error(`failed to check overlap: ${overlapError.message}`);
    if ((overlapCount ?? 0) > 0) return validationFail({ [OVERLAP_FIELD]: OVERLAP_MESSAGE });

    const { data: created, error: insertError } = await admin
      .from("competitions")
      .insert({
        organizer_id: user.id,
        name: input.name,
        description: input.description === "" ? null : input.description,
        start_at: input.startAt.toISOString(),
        end_at: input.endAt.toISOString(),
        participation_rating_min_id: input.ratingMinId,
        participation_rating_max_id: input.ratingMaxId,
        continuous_play_required: input.continuousPlayRequired,
      })
      .select("id")
      .single();
    if (insertError) {
      // 同時リクエストによる重複はDBの排他制約で検出する
      if (insertError.code === EXCLUSION_VIOLATION) return validationFail({ [OVERLAP_FIELD]: OVERLAP_MESSAGE });
      throw new Error(`failed to insert competition: ${insertError.message}`);
    }
    competitionId = created.id;

    const { error: targetError } = await admin.from("competition_target_charts").insert(
      input.chartIds.map((chartId, index) => ({
        competition_id: competitionId,
        chart_id: chartId,
        order_index: index,
      })),
    );
    if (targetError) {
      await admin.from("competitions").delete().eq("id", competitionId);
      throw new Error(`failed to insert target charts: ${targetError.message}`);
    }
  } catch (cause) {
    return { result: failInternal("createCompetition", cause), values };
  }

  revalidatePath("/competitions");
  redirect(`/competitions/${competitionId}`);
}

/** ユーザーのRating区分が大会の参加条件を満たすか確認する。 */
async function checkUserAgainstCondition(user: CurrentUser, competition: CompetitionRow) {
  const admin = createAdminClient();
  const { data: profile, error } = await admin.from("users").select("rating_class_id").eq("id", user.id).single();
  if (error) throw new Error(`failed to fetch user rating: ${error.message}`);

  const ids = [
    profile.rating_class_id,
    competition.participation_rating_min_id,
    competition.participation_rating_max_id,
  ].filter((id): id is number => id !== null);
  const { data: ratings, error: ratingError } =
    ids.length > 0
      ? await admin.from("rating_classes").select("id, sort_order").in("id", ids)
      : { data: [], error: null };
  if (ratingError) throw new Error(`failed to fetch rating classes: ${ratingError.message}`);

  const orderOf = (id: number | null) =>
    id === null ? null : (ratings.find((rating) => rating.id === id)?.sort_order ?? null);
  return checkParticipationCondition(orderOf(profile.rating_class_id), {
    min: orderOf(competition.participation_rating_min_id),
    max: orderOf(competition.participation_rating_max_id),
  });
}

/** 大会に参加する。終了前の大会で、参加条件を満たし、取消されていない場合のみ可能。 */
export async function joinCompetition(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const competitionId = values.competitionId ?? "";
  const user = await getCurrentUser();
  if (!user) return { result: fail("UNAUTHENTICATED", "ログインが必要です"), values };

  try {
    const loaded = await loadCompetition(competitionId);
    if (!loaded) return { result: fail("NOT_FOUND", "大会が見つかりません"), values };
    if (loaded.status === "finished") return { result: fail("CONFLICT", "終了した大会には参加できません"), values };

    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("competition_participants")
      .select("withdrawn_at, removed_at")
      .eq("competition_id", competitionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) throw new Error(`failed to fetch participation: ${existingError.message}`);
    if (existing?.removed_at) {
      return { result: fail("FORBIDDEN", "主催者により参加が取り消されているため、再参加できません"), values };
    }
    if (existing && !existing.withdrawn_at) {
      return { result: fail("CONFLICT", "すでに参加しています"), values };
    }

    const condition = await checkUserAgainstCondition(user, loaded.competition);
    if (!condition.ok) return { result: fail("FORBIDDEN", condition.reason), values };

    if (existing) {
      const { error } = await admin
        .from("competition_participants")
        .update({ withdrawn_at: null, joined_at: new Date().toISOString() })
        .eq("competition_id", competitionId)
        .eq("user_id", user.id);
      if (error) throw new Error(`failed to rejoin: ${error.message}`);
    } else {
      const { error } = await admin
        .from("competition_participants")
        .insert({ competition_id: competitionId, user_id: user.id });
      if (error?.code === UNIQUE_VIOLATION) return { result: fail("CONFLICT", "すでに参加しています"), values };
      if (error) throw new Error(`failed to join: ${error.message}`);
    }
  } catch (cause) {
    return { result: failInternal("joinCompetition", cause), values };
  }

  revalidateCompetition(competitionId);
  return { result: ok(), values };
}

/** 大会から離脱する。開催前、または開催中で自身の提出が0件の場合のみ可能。 */
export async function leaveCompetition(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const competitionId = values.competitionId ?? "";
  const user = await getCurrentUser();
  if (!user) return { result: fail("UNAUTHENTICATED", "ログインが必要です"), values };

  try {
    const loaded = await loadCompetition(competitionId);
    if (!loaded) return { result: fail("NOT_FOUND", "大会が見つかりません"), values };
    if (loaded.status === "finished") return { result: fail("CONFLICT", "終了した大会からは離脱できません"), values };
    if (loaded.status === "ongoing" && (await countMySubmissions(competitionId, user.id)) > 0) {
      return { result: fail("CONFLICT", "スコアを提出済みのため離脱できません"), values };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("competition_participants")
      .update({ withdrawn_at: new Date().toISOString() })
      .eq("competition_id", competitionId)
      .eq("user_id", user.id)
      .is("withdrawn_at", null)
      .is("removed_at", null)
      .select("user_id");
    if (error) throw new Error(`failed to leave: ${error.message}`);
    if (data.length === 0) return { result: fail("CONFLICT", "参加していません"), values };
  } catch (cause) {
    return { result: failInternal("leaveCompetition", cause), values };
  }

  revalidateCompetition(competitionId);
  return { result: ok(), values };
}

type OrganizerCheck =
  | { ok: false; error: NonNullable<FormState> }
  | { ok: true; user: CurrentUser; loaded: Loaded };

/** 主催者本人か確認する。失敗時はエラー状態を返す。 */
async function requireOrganizer(competitionId: string, values: Record<string, string>): Promise<OrganizerCheck> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: { result: fail("UNAUTHENTICATED", "ログインが必要です"), values } };

  const loaded = await loadCompetition(competitionId);
  if (!loaded) return { ok: false, error: { result: fail("NOT_FOUND", "大会が見つかりません"), values } };
  if (loaded.competition.organizer_id !== user.id) {
    return { ok: false, error: { result: fail("FORBIDDEN", "主催者のみ実行できます"), values } };
  }
  return { ok: true, user, loaded };
}

/** 大会の説明を更新する（主催者のみ。変更可能なのは説明のみ）。 */
export async function updateCompetitionDescription(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const competitionId = values.competitionId ?? "";

  const parsed = competitionDescriptionSchema.safeParse(values.description ?? "");
  if (!parsed.success) {
    return {
      result: fail("VALIDATION_ERROR", "入力内容を確認してください", { description: parsed.error.issues[0].message }),
      values,
    };
  }

  try {
    const checked = await requireOrganizer(competitionId, values);
    if (!checked.ok) return checked.error;

    const supabase = await createClient();
    const { error } = await supabase
      .from("competitions")
      .update({ description: parsed.data === "" ? null : parsed.data })
      .eq("id", competitionId);
    if (error) throw new Error(`failed to update description: ${error.message}`);
  } catch (cause) {
    return { result: failInternal("updateCompetitionDescription", cause), values };
  }

  revalidateCompetition(competitionId);
  return { result: ok(), values };
}

/** 参加者の参加を取り消す（主催者のみ）。 */
export async function removeParticipant(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const competitionId = values.competitionId ?? "";
  const targetUserId = values.userId ?? "";

  try {
    const checked = await requireOrganizer(competitionId, values);
    if (!checked.ok) return checked.error;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("competition_participants")
      .update({ removed_at: new Date().toISOString(), removed_by: checked.user.id })
      .eq("competition_id", competitionId)
      .eq("user_id", targetUserId)
      .is("removed_at", null)
      .select("user_id");
    if (error) throw new Error(`failed to remove participant: ${error.message}`);
    if (data.length === 0) return { result: fail("NOT_FOUND", "対象の参加者が見つかりません"), values };
  } catch (cause) {
    return { result: failInternal("removeParticipant", cause), values };
  }

  revalidateCompetition(competitionId);
  return { result: ok(), values };
}

/** 大会を削除する（主催者のみ。開催前、または参加者が0人の場合に限る）。 */
export async function deleteCompetition(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const competitionId = values.competitionId ?? "";

  try {
    const checked = await requireOrganizer(competitionId, values);
    if (!checked.ok) return checked.error;

    if (checked.loaded.status !== "scheduled" && (await countActiveParticipants(competitionId)) > 0) {
      return { result: fail("CONFLICT", "開催後は参加者がいる大会を削除できません"), values };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("competitions")
      .update({ deleted_at: new Date().toISOString(), deleted_by: checked.user.id })
      .eq("id", competitionId)
      .is("deleted_at", null);
    if (error) throw new Error(`failed to delete competition: ${error.message}`);
  } catch (cause) {
    return { result: failInternal("deleteCompetition", cause), values };
  }

  revalidatePath("/competitions");
  redirect("/competitions");
}
