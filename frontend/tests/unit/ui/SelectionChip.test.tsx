import { screen } from "@testing-library/react";

import { SelectionChip } from "@/components/ui/selection-chip";
import { renderWithProviders } from "tests/setup/test-utils";

describe("SelectionChip", () => {
  it("renders default and selected state styles", () => {
    const { rerender } = renderWithProviders(
      <SelectionChip selected={false}>Unit</SelectionChip>,
    );

    const chip = screen.getByRole("button", { name: "Unit" });
    expect(chip).toHaveClass("border-border", "bg-background/80", "text-foreground");
    expect(chip).not.toHaveClass("border-primary/30");

    rerender(<SelectionChip selected>Unit</SelectionChip>);

    expect(chip).toHaveClass("border-primary/30", "bg-primary/10", "text-primary");
  });

  it("uses size classes for small and default chips", () => {
    const { rerender } = renderWithProviders(
      <SelectionChip selected={false}>Default</SelectionChip>,
    );

    const chip = screen.getByRole("button", { name: "Default" });
    expect(chip).toHaveClass("h-10", "px-4", "text-sm");

    rerender(
      <SelectionChip selected={false} size="sm">
        Small
      </SelectionChip>,
    );

    expect(screen.getByRole("button", { name: "Small" })).toHaveClass("h-8", "px-3", "text-sm");
  });

  it("merges custom className overrides", () => {
    renderWithProviders(
      <SelectionChip selected={false} className="rounded-full px-6">
        Custom
      </SelectionChip>,
    );

    expect(screen.getByRole("button", { name: "Custom" })).toHaveClass("rounded-full", "px-6");
  });
});
