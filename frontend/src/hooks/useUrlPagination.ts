import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { clampPage, clampPageSize, DEFAULT_PAGE_SIZE } from "@/api/utils/PaginationHelper";

type UseUrlPaginationOptions = {
  pageParam?: string;
  sizeParam?: string;
  defaultSize?: number;
};

export function useUrlPagination({
  pageParam = "page",
  sizeParam = "size",
  defaultSize = DEFAULT_PAGE_SIZE,
}: UseUrlPaginationOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = useMemo(() => clampPage(Number(searchParams.get(pageParam))), [pageParam, searchParams]);
  const size = useMemo(() => {
    const rawSize = searchParams.get(sizeParam);
    if (rawSize == null || rawSize.trim() === "") {
      return defaultSize;
    }

    const parsed = Number(rawSize);
    return clampPageSize(Number.isFinite(parsed) ? parsed : defaultSize);
  }, [defaultSize, searchParams, sizeParam]);

  const setPage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(pageParam, String(clampPage(nextPage)));
    nextParams.set(sizeParam, String(size));
    setSearchParams(nextParams);
  };

  const setSize = (nextSize: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(pageParam, "0");
    nextParams.set(sizeParam, String(clampPageSize(nextSize)));
    setSearchParams(nextParams);
  };

  return {
    page,
    size,
    setPage,
    setSize,
  };
}
