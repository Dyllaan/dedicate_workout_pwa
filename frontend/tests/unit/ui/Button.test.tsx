import { screen } from "@testing-library/react";
import { Link2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { renderWithProviders } from "tests/setup/test-utils";

describe("Button", () => {
  it("renders the provided icon before the label for regular buttons", () => {
    renderWithProviders(
      <Button icon={Link2} onClick={vi.fn()}>
        Open link
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Open link" });
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("applies destructive styling only when explicitly requested", () => {
    renderWithProviders(
      <Button icon={Trash2} variant="destructive" onClick={vi.fn()}>
        Delete item
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Delete item" })).toHaveClass("text-destructive");
  });

  it("supports icon-only buttons through the shared icon prop", () => {
    renderWithProviders(
      <Button aria-label="Delete item" icon={Trash2} size="icon" onClick={vi.fn()} />,
    );

    const button = screen.getByRole("button", { name: "Delete item" });
    expect(button).toHaveClass("size-9");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("allows asChild usage without requiring an icon prop", () => {
    renderWithProviders(
      <Button asChild>
        <Link to="/target">Read more</Link>
      </Button>,
    );

    expect(screen.getByRole("link", { name: "Read more" })).toHaveAttribute("href", "/target");
  });
});
