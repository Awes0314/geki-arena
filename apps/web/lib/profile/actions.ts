"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, failInternal, formDataToValues, type FormState } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getClearedBadges } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { iconExtension, validateIconFile } from "@/lib/validation/icon";
import { toFieldErrors } from "@/lib/validation/field-errors";
import { profileSchema, toSnsLinks } from "@/lib/validation/profile";

const AVATAR_BUCKET = "avatars";

/** 公開URLからバケット内のオブジェクトパスを取り出す（他所の画像ならnull）。 */
function extractAvatarPath(iconUrl: string | null): string | null {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const index = iconUrl?.indexOf(marker) ?? -1;
  return iconUrl && index >= 0 ? decodeURIComponent(iconUrl.slice(index + marker.length)) : null;
}

/** 自身のプロフィールを更新し、成功時はプロフィール閲覧ページへ遷移する。
 *  mode=onboarding の場合は表示名・アイコン・Rating区分のみを更新対象とする。 */
export async function updateProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToValues(formData);
  const onboarding = values.mode === "onboarding";

  const user = await getCurrentUser();
  if (!user) return { result: fail("UNAUTHENTICATED", "ログインが必要です"), values };

  // onboardingでは未送信の項目を空として検証を通し、更新対象からは外す
  const parsed = profileSchema.safeParse(
    onboarding ? { bio: "", snsX: "", snsDiscord: "", snsOther: "", displayedBadgeId: "", ...values } : values,
  );
  const fieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);

  const iconEntry = formData.get("icon");
  const iconFile = iconEntry instanceof File && iconEntry.size > 0 ? iconEntry : null;
  const iconCheck = iconFile ? await validateIconFile(iconFile) : null;
  if (iconCheck && !iconCheck.ok) fieldErrors.icon = iconCheck.message;

  if (!parsed.success || Object.keys(fieldErrors).length > 0) {
    return { result: fail("VALIDATION_ERROR", "入力内容を確認してください", fieldErrors), values };
  }

  const input = parsed.data;
  const fullInput = onboarding ? null : input;
  let uploadedPath: string | null = null;

  try {
    const supabase = await createClient();

    // 表示できるバッジは獲得済みの1件のみ
    if (fullInput?.displayedBadgeId) {
      const badges = await getClearedBadges(user.id);
      if (!badges.some((badge) => badge.id === fullInput.displayedBadgeId)) {
        return {
          result: fail("VALIDATION_ERROR", "入力内容を確認してください", {
            displayedBadgeId: "獲得していないバッジは選択できません",
          }),
          values,
        };
      }
    }

    let iconUrl: string | null = user.icon_url;
    if (values.removeIcon === "on") {
      iconUrl = null;
    } else if (iconCheck?.ok) {
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${iconExtension(iconCheck.mimeType)}`;
      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(uploadedPath, iconCheck.bytes, { contentType: iconCheck.mimeType });
      if (error) throw new Error(`icon upload failed: ${error.message}`);
      iconUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
    }

    const { error } = await supabase
      .from("users")
      .update({
        display_name: input.displayName,
        rating_class_id: input.ratingClassId === "" ? null : Number(input.ratingClassId),
        icon_url: iconUrl,
        ...(fullInput && {
          bio: fullInput.bio === "" ? null : fullInput.bio,
          sns_links: toSnsLinks(fullInput),
          displayed_badge_id: fullInput.displayedBadgeId === "" ? null : fullInput.displayedBadgeId,
        }),
      })
      .eq("id", user.id);
    if (error) throw new Error(`profile update failed: ${error.message}`);

    // 旧アイコンの削除は失敗しても更新結果に影響させない
    const oldPath = extractAvatarPath(user.icon_url);
    if (oldPath && iconUrl !== user.icon_url) {
      await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
    }
  } catch (cause) {
    if (uploadedPath) {
      const supabase = await createClient();
      await supabase.storage.from(AVATAR_BUCKET).remove([uploadedPath]);
    }
    return { result: failInternal("updateProfile", cause), values };
  }

  revalidatePath(`/users/${user.user_no}`);
  redirect(`/users/${user.user_no}`);
}
