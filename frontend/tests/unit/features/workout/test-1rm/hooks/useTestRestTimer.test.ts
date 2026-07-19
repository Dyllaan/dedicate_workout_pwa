import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTestRestTimer } from "@/features/workout/test-1rm/hooks/useTestRestTimer";

describe("useTestRestTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is inactive when restStartedAt is null", () => {
    const { result } = renderHook(() => useTestRestTimer(null, 180));
    expect(result.current.isActive).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it("ticks elapsed seconds after restStartedAt is set", () => {
    const now = Date.now();
    const { result } = renderHook(() => useTestRestTimer(now, 180));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(5);
    expect(result.current.isActive).toBe(true);
    expect(result.current.isOverTarget).toBe(false);
  });

  it("marks isOverTarget when elapsed exceeds target", () => {
    const now = Date.now();
    const { result } = renderHook(() => useTestRestTimer(now, 3));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isOverTarget).toBe(true);
    expect(result.current.displayLabel).toContain("0:05");
  });

  it("resets when restStartedAt changes to a new timestamp", () => {
    const now = Date.now();
    const { result, rerender } = renderHook(
      ({ startedAt }) => useTestRestTimer(startedAt, 180),
      { initialProps: { startedAt: now as number | null } },
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    const later = Date.now() + 20000;
    rerender({ startedAt: later });

    expect(result.current.elapsedSeconds).toBe(0);
  });
});
