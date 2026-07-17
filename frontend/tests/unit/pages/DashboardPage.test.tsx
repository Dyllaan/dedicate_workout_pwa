const authMock = vi.fn();
const dashboardSummaryMock = vi.fn();
const refreshDashboardMock = vi.fn();

vi.mock("@/features/auth/hooks/useAuth", () => {
  const MockAuthContext = Object.assign(
    ({ children }: { children: React.ReactNode }) => children as React.JSX.Element,
    {
      Provider: ({ children }: { children: React.ReactNode }) => children as React.JSX.Element,
      displayName: "AuthContext",
    },
  );

  return {
    useAuth: () => authMock(),
    AuthContext: MockAuthContext,
  };
});

vi.mock("@/features/dashboard/hooks/useDashboardSummary", () => ({
  useDashboardSummary: () => dashboardSummaryMock(),
}));

vi.mock("@/features/dashboard/hooks/useDashboardRefresh", () => ({
  useDashboardRefresh: () => ({
    refreshDashboard: refreshDashboardMock,
    isRefreshing: false,
  }),
}));

vi.mock("@/components/theme/ThemeToggle", () => ({
  ThemeToggle: () => <div>Theme toggle</div>,
}));

vi.mock("@/features/dashboard/components/TrainingStatusBanner", () => ({
  default: ({ splitId }: { splitId: string }) => <div>Training banner {splitId}</div>,
}));

vi.mock("@/features/dashboard/components/NextWorkoutCard", () => ({
  default: () => <div>Next workout card</div>,
}));

vi.mock("@/features/dashboard/components/LiftSummaryCard", () => ({
  default: () => <div>Lift summary card</div>,
}));

vi.mock("@/features/dashboard/components/TipCarousel", () => ({
  default: () => <div>Tip carousel</div>,
}));

vi.mock("@/features/onboarding/components/OnboardingDialog", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Onboarding open</div> : null),
}));

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/pages/DashboardPage";
import { buildDashboardSummary, buildSplit, buildUser } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

describe("DashboardPage", () => {
  beforeEach(() => {
    refreshDashboardMock.mockReset();
  });

  it("shows a loading subtitle while the summary query is resolving", () => {
    authMock.mockReturnValue({ user: buildUser({ username: "Louis" }) });
    dashboardSummaryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderWithProviders(<DashboardPage />);

    expect(screen.getByText("Loading your training summary.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Workout/i })).toBeInTheDocument();
  });

  it("renders the signed-in dashboard shell and opens onboarding", async () => {
    const user = userEvent.setup();
    vi.setSystemTime(new Date("2026-04-26T09:00:00.000Z"));
    const split = buildSplit({ name: "Upper Lower Split" });

    authMock.mockReturnValue({ user: buildUser({ username: "Louis" }) });
    dashboardSummaryMock.mockReturnValue({
      data: buildDashboardSummary({
        activeSplit: { id: split.id, name: split.name },
      }),
      isLoading: false,
    });

    renderWithProviders(<DashboardPage />);

    expect(screen.getByText(/Morning/)).toHaveTextContent("Morning Louis.");
    expect(screen.getByText("Active split: Upper Lower Split.")).toBeInTheDocument();
    expect(screen.getByText("Next workout card")).toBeInTheDocument();
    expect(screen.getByText(`Training banner ${split.id}`)).toBeInTheDocument();
    expect(screen.getByText("Lift summary card")).toBeInTheDocument();
    expect(screen.getByText("Tip carousel")).toBeInTheDocument();
    expect(screen.getByText("Theme toggle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh dashboard" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByText("Onboarding open")).toBeInTheDocument();
  });

  it("manually refreshes dashboard analytics from the header", async () => {
    const user = userEvent.setup();
    authMock.mockReturnValue({ user: buildUser({ username: "Louis" }) });
    dashboardSummaryMock.mockReturnValue({
      data: buildDashboardSummary(),
      isLoading: false,
    });

    renderWithProviders(<DashboardPage />);

    await user.click(screen.getByRole("button", { name: "Refresh dashboard" }));

    expect(refreshDashboardMock).toHaveBeenCalledTimes(1);
  });

  it("shows the no-active-split state", () => {
    vi.setSystemTime(new Date("2026-04-26T18:00:00.000Z"));

    authMock.mockReturnValue({ user: buildUser({ username: "Louis" }) });
    dashboardSummaryMock.mockReturnValue({
      data: buildDashboardSummary({ activeSplit: null }),
      isLoading: false,
    });

    renderWithProviders(<DashboardPage />);

    expect(screen.getByText(/Evening/)).toHaveTextContent("Evening Louis.");
    expect(screen.getByText("No active split yet. Set one in periodisation to tailor the dashboard.")).toBeInTheDocument();
  });
});
