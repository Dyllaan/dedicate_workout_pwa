import { screen } from "@testing-library/react";
import BottomNav from "@/components/layout/section/BottomNav";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("BottomNav", () => {
  it("treats /dashboard as the active home tab", () => {
    renderWithProviders(<BottomNav />, {
      route: "/dashboard",
      auth: createAuthContextValue({ signedIn: true }),
    });

    const homeLink = screen.getByRole("link", { name: /home/i });
    const workoutsLink = screen.getByRole("link", { name: /workouts/i });

    expect(homeLink).toHaveAttribute("href", "/dashboard");
    expect(homeLink.className).toContain("text-primary");
    expect(workoutsLink.className).toContain("text-muted-foreground");
  });

  it("treats /insights as the active insights tab", () => {
    renderWithProviders(<BottomNav />, {
      route: "/insights",
      auth: createAuthContextValue({ signedIn: true }),
    });

    const insightsLink = screen.getByRole("link", { name: /insights/i });

    expect(insightsLink).toHaveAttribute("href", "/insights");
    expect(insightsLink.className).toContain("text-primary");
  });

  it("hides the bottom nav on auth routes", () => {
    renderWithProviders(<BottomNav />, {
      route: "/login",
      auth: createAuthContextValue({ signedIn: true }),
    });

    expect(screen.queryByRole("navigation", { name: "Primary navigation" })).not.toBeInTheDocument();
  });

  it("uses a single Periodisation tab for periodisation routes", () => {
    renderWithProviders(<BottomNav />, {
      route: "/periodisation?tab=splits",
      auth: createAuthContextValue({ signedIn: true }),
    });

    expect(screen.getByRole("link", { name: /periodisation/i })).toHaveAttribute("href", "/periodisation");
    expect(screen.queryByRole("link", { name: /splits/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /programmes/i })).not.toBeInTheDocument();
  });
});
