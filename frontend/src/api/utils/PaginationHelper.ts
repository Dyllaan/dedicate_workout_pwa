import type { PagedResponse } from "@/api/types/Pagination";

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 25;

export function clampPage(page?: number | null) {
  return Math.max(0, page ?? 0);
}

export function clampPageSize(size?: number | null) {
  const resolvedSize = Number.isFinite(size) ? (size as number) : DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(DEFAULT_PAGE_SIZE, resolvedSize));
}

export function buildPageParams(
  page?: number | null,
  size?: number | null,
  extra?: Record<string, string | number | boolean | null | undefined>,
) {
  return {
    ...(extra ?? {}),
    page: clampPage(page),
    size: clampPageSize(size),
  };
}

export async function fetchAllPagedItems<T>(
  fetchPage: (page: number, size: number) => Promise<PagedResponse<T> | T[]>,
  size = DEFAULT_PAGE_SIZE,
  maxPages = 100,
): Promise<T[]> {
  const items: T[] = [];
  let page = 0;

  while (page < maxPages) {
    const response = await fetchPage(page, size);
    if (Array.isArray(response)) {
      items.push(...response);
      break;
    }

    items.push(...response.items);

    if (!response.hasNext) {
      break;
    }

    page += 1;
  }

  return items;
}