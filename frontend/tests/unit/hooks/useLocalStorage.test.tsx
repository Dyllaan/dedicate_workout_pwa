import { act, renderHook } from "@testing-library/react";
import useLocalStorage from "@/hooks/useLocalStorage";

describe("useLocalStorage", () => {
  it("uses the initial value when storage is empty and persists updates", () => {
    const { result } = renderHook(() => useLocalStorage("theme", "light"));

    expect(result.current[0]).toBe("light");

    act(() => {
      result.current[1]("dark");
    });

    expect(result.current[0]).toBe("dark");
    expect(localStorage.getItem("theme")).toBe(JSON.stringify("dark"));
  });

  it("restores serialized dates for createdAt values", () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        createdAt: "2026-04-24T10:00:00.000Z",
      }),
    );

    const { result } = renderHook(() =>
      useLocalStorage("user", { createdAt: new Date(0) }),
    );

    expect(result.current[0].createdAt).toBeInstanceOf(Date);
    expect(result.current[0].createdAt.toISOString()).toBe(
      "2026-04-24T10:00:00.000Z",
    );
  });

  it("falls back to the initial value when stored JSON is invalid", () => {
    localStorage.setItem("broken", "{invalid-json");

    const { result } = renderHook(() => useLocalStorage("broken", "fallback"));

    expect(result.current[0]).toBe("fallback");
  });

  it("silently ignores localStorage write failures", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });

    const { result } = renderHook(() => useLocalStorage("draft", "initial"));

    expect(() =>
      act(() => {
        result.current[1]("next");
      }),
    ).not.toThrow();

    setItemSpy.mockRestore();
  });
});
