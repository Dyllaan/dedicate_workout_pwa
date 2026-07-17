const useQueryMock = vi.fn((options: { queryFn?: () => unknown }) => {
  if (options.queryFn) {
    Promise.resolve(options.queryFn()).catch(() => undefined);
  }

  return {
    data: undefined,
    error: null,
    isLoading: false,
  };
});

vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: undefined,
  useMutation: vi.fn(),
  useQuery: (options: { queryFn?: () => unknown }) => useQueryMock(options),
  useQueryClient: vi.fn(),
}));

import { renderHook } from "@testing-library/react";
import { useSplit } from @/features/periodisation/splits/hooks/useSplits";

describe("useSplit query function guard", () => {
  it("disables the split query when no split id is provided", () => {
    renderHook(() => useSplit(undefined));

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});
