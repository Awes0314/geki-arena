/** @jest-environment node */
import { detectImageType, ICON_MAX_BYTES, validateIconFile } from "@/lib/validation/icon";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

function makeFile(bytes: number[], name = "a.bin", type = "application/octet-stream"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("detectImageType", () => {
  it("png / jpeg / webp を判定する", () => {
    expect(detectImageType(new Uint8Array(PNG))).toBe("image/png");
    expect(detectImageType(new Uint8Array(JPEG))).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array(WEBP))).toBe("image/webp");
  });

  it("対応外の形式はnullを返す", () => {
    expect(detectImageType(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull();
    expect(detectImageType(new Uint8Array([]))).toBeNull();
  });
});

describe("validateIconFile", () => {
  it("Content-Typeを偽装していても中身で判定する", async () => {
    const result = await validateIconFile(makeFile([0x3c, 0x73, 0x76, 0x67], "a.png", "image/png"));
    expect(result.ok).toBe(false);
  });

  it("有効な画像を受け付ける", async () => {
    const result = await validateIconFile(makeFile(PNG));
    expect(result).toMatchObject({ ok: true, mimeType: "image/png" });
  });

  it("2MBを超える画像を拒否する", async () => {
    const big = new File([new Uint8Array(ICON_MAX_BYTES + 1)], "big.png", { type: "image/png" });
    const result = await validateIconFile(big);
    expect(result.ok).toBe(false);
  });
});
