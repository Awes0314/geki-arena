import { z } from "zod";

export const USER_ID_PATTERN = /^[a-z0-9_]{3,20}$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// userIdは大文字小文字を区別せず小文字に正規化する
const userIdField = z.string().trim().toLowerCase();

export const loginSchema = z.object({
  userId: userIdField.min(1, "ユーザーIDを入力してください").max(64, "ユーザーIDが長すぎます"),
  password: z.string().min(1, "パスワードを入力してください").max(256, "パスワードが長すぎます"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    userId: userIdField.regex(USER_ID_PATTERN, "ユーザーIDは半角英数字とアンダースコアの3〜20文字で入力してください"),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`)
      .max(PASSWORD_MAX_LENGTH, `パスワードは${PASSWORD_MAX_LENGTH}文字以下で入力してください`),
    passwordConfirm: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "パスワードが一致しません",
  });

export type RegisterInput = z.infer<typeof registerSchema>;

const newPasswordFields = {
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`)
    .max(PASSWORD_MAX_LENGTH, `パスワードは${PASSWORD_MAX_LENGTH}文字以下で入力してください`),
  passwordConfirm: z.string(),
};

export const passwordResetSchema = z
  .object({
    userId: userIdField.min(1, "ユーザーIDを入力してください").max(64, "ユーザーIDが長すぎます"),
    recoveryCode: z.string().trim().min(1, "リカバリーコードを入力してください").max(64, "リカバリーコードが長すぎます"),
    ...newPasswordFields,
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "パスワードが一致しません",
  });

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
