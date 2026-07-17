import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { workoutApi } from "@/api/api";
import useBodyweightLogs from "@/features/bodyweight/hooks/useBodyweightLogs";
import { buildBodyweightLog } from "tests/shared/builders";
import { createTestQueryClient } from "tests/setup/test-utils";

vi.mock("@/api/api", async (importActual) => {
  const actual = await importActual<typeof import("@/api/api")>();
  return {
    ...actual,
    workoutApi: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { accessToken: "test-token" } }),
}));

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useBodyweightLogs", () => {
  const mockGet = workoutApi.get as ReturnType<typeof vi.fn>;
  const mockPost = workoutApi.post as ReturnType<typeof vi.fn>;
  const mockDelete = workoutApi.delete as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches logs sorted newest-first from API", async () => {
    const logs = [
      buildBodyweightLog({ id: "bw-1", weightKg: 80, loggedAt: "2026-05-10" }),
      buildBodyweightLog({ id: "bw-2", weightKg: 81, loggedAt: "2026-05-01" }),
    ];
    mockGet.mockResolvedValue({ data: logs });

    const { result } = renderHook(() => useBodyweightLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs[0].id).toBe("bw-1");
    expect(mockGet).toHaveBeenCalledWith("/bodyweight-logs", {
      params: { page: 0, size: 10 },
    });
  });

  it("returns empty array when no logs exist", async () => {
    mockGet.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useBodyweightLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.logs).toEqual([]);
  });

  it("does not fetch logs when disabled", () => {
    const { result } = renderHook(() => useBodyweightLogs({ enabled: false }), { wrapper: createWrapper() });

    expect(result.current.logs).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("calls POST and invalidates cache on addLog", async () => {
    const existingLog = buildBodyweightLog({ weightKg: 80, loggedAt: "2026-05-01" });
    const newLog = buildBodyweightLog({ weightKg: 82, loggedAt: "2026-05-10" });
    mockGet.mockResolvedValue({ data: [existingLog] });
    mockPost.mockResolvedValue({ data: newLog });

    const { result } = renderHook(() => useBodyweightLogs(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockGet.mockResolvedValue({ data: [newLog, existingLog] });

    await act(async () => {
      await result.current.addLog({ weightKg: 82, loggedAt: "2026-05-10" });
    });

    expect(mockPost).toHaveBeenCalledWith("/bodyweight-logs", { weightKg: 82, loggedAt: "2026-05-10" });
    await waitFor(() => expect(result.current.logs).toHaveLength(2));
  });

  it("calls DELETE and invalidates cache on deleteLog", async () => {
    const log = buildBodyweightLog({ id: "bw-del", weightKg: 80, loggedAt: "2026-05-01" });
    mockGet.mockResolvedValue({ data: [log] });
    mockDelete.mockResolvedValue({ data: undefined, status: 204 });

    const { result } = renderHook(() => useBodyweightLogs(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockGet.mockResolvedValue({ data: [] });

    await act(async () => {
      await result.current.deleteLog("bw-del");
    });

    expect(mockDelete).toHaveBeenCalledWith("/bodyweight-logs/bw-del");
    await waitFor(() => expect(result.current.logs).toHaveLength(0));
  });
});
