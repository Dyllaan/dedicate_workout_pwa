import { fireEvent, screen, waitFor } from "@testing-library/react";
import SplitOrder from "@/features/periodisation/splits/components/splits/creation/SplitOrder";
import { buildWorkoutTemplate } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

describe("SplitOrder", () => {
  it("submits weekly workout frequencies with the ordered split", async () => {
    const onComplete = vi.fn();
    const push = buildWorkoutTemplate({ id: "push-day", name: "Push Day" });
    const pull = buildWorkoutTemplate({ id: "pull-day", name: "Pull Day" });

    renderWithProviders(
      <SplitOrder
        workouts={[push, pull]}
        initialFrequencies={{ "push-day": 2, "pull-day": 1 }}
        onBack={vi.fn()}
        onComplete={onComplete}
      />,
    );

    expect(screen.getByText("2x/wk")).toBeInTheDocument();
    expect(screen.getByText("1x/wk")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Increase Pull Day frequency" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        name: "My Split",
        workoutFrequencies: [
          { workoutTemplateId: "push-day", sessionsPerWeek: 2 },
          { workoutTemplateId: "pull-day", sessionsPerWeek: 2 },
        ],
      }),
    );
  });
});
