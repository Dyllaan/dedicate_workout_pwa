import { fireEvent, screen } from "@testing-library/react";
import { Pencil } from "lucide-react";

import BaseInput from "@/components/layout/input/BaseInput";
import { renderWithProviders } from "tests/setup/test-utils";

describe("BaseInput", () => {
  it("forwards aria-invalid while preserving child adornments", () => {
    renderWithProviders(
      <BaseInput
        value="Edit split"
        readOnly
        aria-label="Split name"
        aria-invalid={false}
      >
        <Pencil data-testid="base-input-icon" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      </BaseInput>,
    );

    expect(screen.getByRole("textbox", { name: "Split name" })).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByTestId("base-input-icon")).toBeInTheDocument();
  });

  it("marks empty required values invalid on blur when no explicit invalid state is provided", () => {
    renderWithProviders(
      <BaseInput value="" onChange={() => {}} aria-label="Workout name" />,
    );

    const input = screen.getByRole("textbox", { name: "Workout name" });
    fireEvent.blur(input);

    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
