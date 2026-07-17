vi.mock("react-muscle-highlighter", () => ({
  default: ({ data, side }: { data?: Array<{ slug?: string }>; side?: string }) => (
    <div data-side={side} data-testid="mock-muscle-body">
      {(data ?? []).map((part) => part.slug).join(",")}
    </div>
  ),
}));

import { screen } from "@testing-library/react";
import MuscleBody from "@/features/heatmap/components/MuscleBody";
import { renderWithProviders } from "tests/setup/test-utils";

describe("MuscleBody", () => {
  it("renders only active front muscles on the front view", () => {
    renderWithProviders(
      <MuscleBody
        side="front"
        intensities={{ chest: 1, front_delt: 0.5, triceps: 0.7, calves: 0 }}
      />,
    );

    expect(screen.getByTestId("mock-muscle-body")).toHaveTextContent("chest,deltoids");
    expect(screen.getByTestId("mock-muscle-body")).not.toHaveTextContent("triceps");
    expect(screen.getByTestId("mock-muscle-body")).not.toHaveTextContent("calves");
  });

  it("renders only active back muscles on the back view", () => {
    renderWithProviders(
      <MuscleBody
        side="back"
        intensities={{ lats: 0.7, rear_delt: 0.4, biceps: 0.8, lower_back: 0 }}
      />,
    );

    expect(screen.getByTestId("mock-muscle-body")).toHaveTextContent("upper-back,deltoids");
    expect(screen.getByTestId("mock-muscle-body")).not.toHaveTextContent("biceps");
    expect(screen.getByTestId("mock-muscle-body")).not.toHaveTextContent("lower-back");
  });
});
