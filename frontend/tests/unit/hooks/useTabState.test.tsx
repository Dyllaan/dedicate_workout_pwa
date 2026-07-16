import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import useTabState from "@/hooks/useTabState";

describe("useTabState", () => {
  it("resolves and updates URL-backed tabs", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/path?tab=programme"]}>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () =>
        useTabState({
          validTabs: ["overview", "programme", "setup"] as const,
          defaultTab: "overview",
          queryParam: "tab",
        }),
      { wrapper },
    );

    expect(result.current.activeTab).toBe("programme");

    act(() => {
      result.current.setActiveTab("setup");
    });

    expect(result.current.activeTab).toBe("setup");
  });

  it("supports local tabs without URL sync", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/path"]}>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () =>
        useTabState({
          validTabs: ["view", "exercise"] as const,
          defaultTab: "view",
        }),
      { wrapper },
    );

    expect(result.current.activeTab).toBe("view");

    act(() => {
      result.current.setActiveTab("exercise");
    });

    expect(result.current.activeTab).toBe("exercise");
  });
});
