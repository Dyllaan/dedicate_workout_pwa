import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { render } from "@testing-library/react";

describe("Tooltip", () => {
  it("renders the child element within a tooltip root", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <button type="button" aria-label="Refresh dashboard">
            Refresh
          </button>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Refresh dashboard" })).toBeInTheDocument();
  });
});
