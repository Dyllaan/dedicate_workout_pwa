import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { buildPageParams, clampPageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/api/utils/PaginationHelper";
import { useUrlPagination } from "@/hooks/useUrlPagination";

function createWrapper(route: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );
}

describe("pagination helpers", () => {
  it("clamps tiny page sizes up to the supported default", () => {
    expect(clampPageSize(1)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(MAX_PAGE_SIZE + 10)).toBe(MAX_PAGE_SIZE);
    expect(buildPageParams(0, 1)).toEqual({ page: 0, size: DEFAULT_PAGE_SIZE });
  });
});

describe("useUrlPagination", () => {
  it("defaults a missing size query param to the default page size", () => {
    const wrapper = createWrapper("/workout/123/entries?entriesPage=0");

    const { result } = renderHook(
      () =>
        useUrlPagination({
          pageParam: "entriesPage",
          sizeParam: "entriesSize",
        }),
      { wrapper },
    );

    expect(result.current.page).toBe(0);
    expect(result.current.size).toBe(DEFAULT_PAGE_SIZE);
  });

  it("clamps explicit tiny sizes and keeps the clamped size when paginating", () => {
    const wrapper = createWrapper("/workout/123/entries?entriesPage=0&entriesSize=1");

    const { result } = renderHook(
      () =>
        useUrlPagination({
          pageParam: "entriesPage",
          sizeParam: "entriesSize",
        }),
      { wrapper },
    );

    expect(result.current.size).toBe(DEFAULT_PAGE_SIZE);

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
    expect(result.current.size).toBe(DEFAULT_PAGE_SIZE);
  });
});
