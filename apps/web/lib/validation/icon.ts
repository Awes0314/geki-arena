export const ICON_MAX_BYTES = 2 * 1024 * 1024;

const EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export type IconMimeType = keyof typeof EXTENSIONS;

/** ファイル先頭のバイト列から画像形式を判定する（Content-Typeは信頼しない）。 */
export function detectImageType(bytes: Uint8Array): IconMimeType | null {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, i) => bytes[offset + i] === byte);

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  // RIFF....WEBP
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

export function iconExtension(mimeType: IconMimeType): string {
  return EXTENSIONS[mimeType];
}

export type IconValidation =
  | { ok: true; mimeType: IconMimeType; bytes: Uint8Array }
  | { ok: false; message: string };

export async function validateIconFile(file: File): Promise<IconValidation> {
  if (file.size > ICON_MAX_BYTES) {
    return { ok: false, message: "画像サイズは2MB以下にしてください" };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectImageType(bytes);
  if (!mimeType) {
    return { ok: false, message: "png / jpeg / webp の画像を選択してください" };
  }
  return { ok: true, mimeType, bytes };
}
