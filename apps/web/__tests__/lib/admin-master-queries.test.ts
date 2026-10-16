const ilike = jest.fn();
const range = jest.fn();
let result: { data: unknown[] | null; count: number | null; error: { message: string } | null };

const chain: Record<string, unknown> = {
  select: () => chain,
  order: () => chain,
  range: (...args: unknown[]) => {
    range(...args);
    return chain;
  },
  ilike: (...args: unknown[]) => {
    ilike(...args);
    return chain;
  },
  then: (resolve: (value: unknown) => unknown) => resolve(result),
};

jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => chain }) }));

import { listMasterMusics, MASTER_PAGE_SIZE } from "@/lib/admin/master-queries";

describe("listMasterMusics", () => {
  beforeEach(() => {
    ilike.mockClear();
    range.mockClear();
    result = { data: [], count: 0, error: null };
  });

  it("ページ番号に応じた範囲で取得する", async () => {
    await listMasterMusics("", 3);
    expect(range).toHaveBeenCalledWith(MASTER_PAGE_SIZE * 2, MASTER_PAGE_SIZE * 3 - 1);
    expect(ilike).not.toHaveBeenCalled();
  });

  it("ワイルドカード等のメタ文字を除去して部分一致検索する", async () => {
    await listMasterMusics("a%b_c,(d)", 1);
    expect(ilike).toHaveBeenCalledWith("title", "%a b c  d%");
  });

  it("エラー時は例外を投げる", async () => {
    result = { data: null, count: null, error: { message: "boom" } };
    await expect(listMasterMusics("", 1)).rejects.toThrow("failed to fetch musics: boom");
  });
});
