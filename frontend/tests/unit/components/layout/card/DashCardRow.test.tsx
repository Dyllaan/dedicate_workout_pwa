import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "lucide-react";
import { DashCardRow } from "@/components/layout/card/DashCardRow";

describe("DashCardRow", () => {
  it("renders trigger rows without an inner button", () => {
    render(
      <DashCardRow
        icon={Calendar}
        label="Trigger row"
        variant="trigger"
        onClick={vi.fn() as never}
      />,
    );

    expect(screen.queryByRole("button", { name: "Trigger row" })).not.toBeInTheDocument();
    expect(screen.getByText("Trigger row")).toBeInTheDocument();
  });

  it("still renders clickable rows as buttons", () => {
    render(
      <DashCardRow
        icon={Calendar}
        label="Clickable row"
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Clickable row/i })).toBeInTheDocument();
  });
});
