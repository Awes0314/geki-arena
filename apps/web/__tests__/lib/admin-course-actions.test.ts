const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const COURSE_ID = "77777777-7777-4777-8777-777777777777";
const CHART_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const getAdminUser = jest.fn();
const recordOperation = jest.fn();
const rpc = jest.fn();
let activeChartCount: number;

jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
jest.mock("@/lib/admin/guard", () => ({ getAdminUser: () => getAdminUser() }));
jest.mock("@/lib/logging/operation-log", () => ({ recordOperation: (...args: unknown[]) => recordOperation(...args) }));
jest.mock("@/lib/supabase/admin", () => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data: Array.from({ length: activeChartCount }, () => ({ id: "x" })), error: null }),
  };
  return { createAdminClient: () => ({ from: () => chain, rpc: (...args: unknown[]) => rpc(...args) }) };
});

import { createCourse, deleteCourse, updateCourse } from "@/lib/admin/course-actions";

function form(fields: Record<string, string>, minScores: string[] = [""]) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  for (const score of minScores) data.append("perChart_minScore", score);
  return data;
}

const valid = { courseName: "コース", chapter: "α", badgeChapter: "alpha", chartIds: CHART_A };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  getAdminUser.mockResolvedValue({ id: ADMIN_ID, role: "admin" });
  activeChartCount = 1;
});

describe("createCourse", () => {
  it("運営以外はFORBIDDEN", async () => {
    getAdminUser.mockResolvedValue(null);
    const state = await createCourse(null, form(valid));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("入力が不正ならVALIDATION_ERROR", async () => {
    const state = await createCourse(null, form({ ...valid, chapter: "100" }));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("無効な譜面が含まれていればVALIDATION_ERROR", async () => {
    activeChartCount = 0;
    const state = await createCourse(null, form(valid));
    expect(state?.result).toMatchObject({ ok: false, error: { fieldErrors: { chartIds: expect.any(String) } } });
  });

  it("RPCで作成して操作ログを記録し、詳細へ遷移する", async () => {
    rpc.mockResolvedValue({ data: COURSE_ID, error: null });
    await expect(createCourse(null, form(valid))).rejects.toThrow(`REDIRECT:/admin/courses/${COURSE_ID}`);
    expect(rpc).toHaveBeenCalledWith(
      "admin_create_course",
      expect.objectContaining({ p_chapter: "α", p_chart_ids: [CHART_A] }),
    );
    expect(recordOperation).toHaveBeenCalledWith(expect.objectContaining({ actionType: "course_create", targetId: COURSE_ID }));
  });
});

describe("updateCourse", () => {
  it("挑戦結果があり譜面構成を変更しようとするとCONFLICT", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "course_has_results" } });
    const state = await updateCourse(null, form({ ...valid, courseId: COURSE_ID }));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(recordOperation).not.toHaveBeenCalled();
  });

  it("コースが存在しなければNOT_FOUND", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "course_not_found" } });
    const state = await updateCourse(null, form({ ...valid, courseId: COURSE_ID }));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("更新して操作ログを記録する", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const state = await updateCourse(null, form({ ...valid, courseId: COURSE_ID }));
    expect(state?.result.ok).toBe(true);
    expect(recordOperation).toHaveBeenCalledWith(expect.objectContaining({ actionType: "course_update" }));
  });
});

describe("deleteCourse", () => {
  it("挑戦結果があればCONFLICT", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "course_has_results" } });
    const state = await deleteCourse(null, form({ courseId: COURSE_ID }, []));
    expect(state?.result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("削除して操作ログを記録し、一覧へ遷移する", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(deleteCourse(null, form({ courseId: COURSE_ID }, []))).rejects.toThrow("REDIRECT:/admin/courses");
    expect(recordOperation).toHaveBeenCalledWith(expect.objectContaining({ actionType: "course_delete" }));
  });
});
