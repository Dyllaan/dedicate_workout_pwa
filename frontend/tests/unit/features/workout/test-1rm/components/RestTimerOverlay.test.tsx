import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, act } from "@testing-library/react";
import { renderWithProviders } from "tests/setup/test-utils";
import RestTimerOverlay from "@/features/workout/test-1rm/components/RestTimerOverlay";

describe("RestTimerOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when restStartedAt is null", () => {
    const { container } = renderWithProviders(
      <RestTimerOverlay restStartedAt={null} targetSeconds={180} onSkip={vi.fn()} />,
    );
    expect(screen.queryByText("Rest period")).not.toBeInTheDocument();
    expect(screen.queryByText("Skip rest")).not.toBeInTheDocument();
    expect(container.querySelector(".rounded-2xl")).toBeNull();
  });

  it("shows elapsed time and target", () => {
    const now = Date.now();
    renderWithProviders(
      <RestTimerOverlay restStartedAt={now} targetSeconds={180} onSkip={vi.fn()} />,
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText("Rest period")).toBeInTheDocument();
    expect(screen.getByText(/0:10 \/ 3:00/)).toBeInTheDocument();
  });

  it("calls onSkip when skip button is clicked", async () => {
    const now = Date.now();
    const onSkip = vi.fn();
    renderWithProviders(
      <RestTimerOverlay restStartedAt={now} targetSeconds={180} onSkip={onSkip} />,
    );

    const skipButton = screen.getByText("Skip rest");
    skipButton.click();
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("shows ready state when over target", () => {
    const now = Date.now();
    renderWithProviders(
      <RestTimerOverlay restStartedAt={now} targetSeconds={3} onSkip={vi.fn()} />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("Ready to go")).toBeInTheDocument();
    expect(screen.getByText("Rest complete. Continue when ready.")).toBeInTheDocument();
  });
});
