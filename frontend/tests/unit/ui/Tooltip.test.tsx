import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "@/components/ui/tooltip";
import { render } from "@testing-library/react";

describe("Tooltip", () => {
  it("adds a native title without changing the child label", () => {
    render(
      <Tooltip label="Refresh dashboard">
        <button type="button" aria-label="Refresh dashboard">
          Refresh
        </button>
      </Tooltip>,
    );

    expect(screen.getByRole("button", { name: "Refresh dashboard" })).toHaveAttribute(
      "title",
      "Refresh dashboard",
    );
  });
});
