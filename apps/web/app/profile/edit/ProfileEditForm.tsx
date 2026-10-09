"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/Alert";
import { SelectInput, TextArea, TextInput } from "@/components/ui/Fields";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { CourseBadge } from "@/components/user/CourseBadge";
import { IconPicker } from "@/components/user/IconPicker";
import { updateProfile } from "@/lib/profile/actions";
import type { CourseBadgeData, RatingClassData, UserProfile } from "@/lib/profile/queries";
import { BIO_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH, SNS_LINK_MAX_LENGTH } from "@/lib/validation/profile";

type ProfileEditFormProps = {
  profile: UserProfile;
  ratingClasses: RatingClassData[];
  badges: CourseBadgeData[];
  /** 登録直後: 表示名・アイコン・Rating区分のみ入力する */
  onboarding?: boolean;
};

export function ProfileEditForm({ profile, ratingClasses, badges, onboarding = false }: ProfileEditFormProps) {
  const [state, formAction] = useActionState(updateProfile, null);
  const error = state?.result.ok === false ? state.result.error : null;
  const errors = error?.fieldErrors ?? {};
  const values = state?.values;

  const snsValue = (type: string) => profile.snsLinks.find((link) => link.type === type)?.value ?? "";

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {onboarding && <input type="hidden" name="mode" value="onboarding" />}
      {error && !error.fieldErrors && <Alert variant="error">{error.message}</Alert>}
      {error?.fieldErrors && <Alert variant="error">入力内容に誤りがあります。各項目をご確認ください。</Alert>}

      <IconPicker currentUrl={profile.iconUrl} name={profile.displayName} error={errors.icon} />

      <TextInput
        label="表示名"
        name="displayName"
        required
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        defaultValue={values?.displayName ?? profile.displayName}
        error={errors.displayName}
      />

      <SelectInput
        label="Rating区分"
        name="ratingClassId"
        hint="自己申告の値です。外部データとの照合は行われません。"
        defaultValue={values?.ratingClassId ?? String(profile.ratingClassId ?? "")}
        error={errors.ratingClassId}
      >
        <option value="">未設定</option>
        {ratingClasses.map((ratingClass) => (
          <option key={ratingClass.id} value={ratingClass.id}>
            {ratingClass.label}
          </option>
        ))}
      </SelectInput>

      {!onboarding && (
        <>
          <TextArea
            label="自己紹介"
            name="bio"
            rows={5}
            maxLength={BIO_MAX_LENGTH}
            hint={`${BIO_MAX_LENGTH}文字以内`}
            defaultValue={values?.bio ?? profile.bio ?? ""}
            error={errors.bio}
          />

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2 text-sm font-medium">外部SNS</legend>
            <TextInput
              label="X"
              name="snsX"
              placeholder="@..."
              autoCapitalize="none"
              maxLength={16}
              defaultValue={values?.snsX ?? snsValue("x")}
              error={errors.snsX}
            />
            <TextInput
              label="Discord"
              name="snsDiscord"
              placeholder="username"
              autoCapitalize="none"
              maxLength={33}
              hint="Discordのユーザー名（半角英数字・_・.、2〜32文字）"
              defaultValue={values?.snsDiscord ?? snsValue("discord")}
              error={errors.snsDiscord}
            />
            <TextInput
              label="その他（URL）"
              name="snsOther"
              type="url"
              inputMode="url"
              placeholder="https://..."
              maxLength={SNS_LINK_MAX_LENGTH}
              defaultValue={values?.snsOther ?? snsValue("other")}
              error={errors.snsOther}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">表示するコースバッジ</legend>
            <p className="text-xs text-muted">獲得済みのバッジから1件を選択できます。</p>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="radio"
                name="displayedBadgeId"
                value=""
                defaultChecked={(values?.displayedBadgeId ?? profile.displayedBadgeId ?? "") === ""}
              />
              表示しない
            </label>
            {badges.map((badge) => (
              <label key={badge.id} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="displayedBadgeId"
                  value={badge.id}
                  defaultChecked={(values?.displayedBadgeId ?? profile.displayedBadgeId) === badge.id}
                />
                <CourseBadge svgUrl={badge.svgUrl} courseName={badge.courseName} size={32} />
                {badge.courseName}
              </label>
            ))}
            {badges.length === 0 && <p className="text-sm text-muted">獲得済みのバッジはまだありません。</p>}
            {errors.displayedBadgeId && (
              <p role="alert" className="text-xs text-red-600">
                {errors.displayedBadgeId}
              </p>
            )}
          </fieldset>
        </>
      )}

      <SubmitButton pendingLabel="保存中...">保存する</SubmitButton>
    </form>
  );
}
