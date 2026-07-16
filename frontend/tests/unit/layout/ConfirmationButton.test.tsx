import { fireEvent, screen } from "@testing-library/react";
import { Trash2 } from "lucide-react";

import ConfirmationButton from "@/components/layout/input/ConfirmationButton";
import { renderWithProviders } from "tests/setup/test-utils";

describe("ConfirmationButton", () => {
  it("switches labels without changing the shared button sizing", () => {
    renderWithProviders(
      <ConfirmationButton
        onConfirm={vi.fn()}
        icon={Trash2}
        label="Delete split"
        confirmLabel="Confirm delete?"
        destructive
      />,
    );

    const button = screen.getByRole("button", { name: "Delete split" });
    expect(button).toHaveClass("h-12");

    fireEvent.click(button);

    const confirmButton = screen.getByRole("button", { name: "Confirm delete?" });
    expect(confirmButton).toHaveClass("h-12");
  });

  it("uses destructive styling only when the action is marked destructive", () => {
    renderWithProviders(
      <ConfirmationButton
        onConfirm={vi.fn()}
        icon={Trash2}
        label="Delete split"
        destructive
      />,
    );

    expect(screen.getByRole("button", { name: "Delete split" })).toHaveClass("text-destructive");
  });

  it("supports a ghost idle variant while switching to destructive confirmation styling", () => {
    renderWithProviders(
      <ConfirmationButton
        onConfirm={vi.fn()}
        icon={Trash2}
        label="Remove"
        confirmLabel="Confirm?"
        variant="ghost"
        confirmVariant="destructive"
      />,
    );

    const idleButton = screen.getByRole("button", { name: "Remove" });
    expect(idleButton).not.toHaveClass("text-destructive");

    fireEvent.click(idleButton);

    const confirmButton = screen.getByRole("button", { name: "Confirm?" });
    expect(confirmButton).toHaveClass("text-destructive");
  });
});
