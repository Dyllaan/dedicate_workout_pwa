import { Dumbbell, HelpCircle } from "lucide-react";
import { screen } from "@testing-library/react";

import Page from "@/components/layout/frames/Page";
import { renderWithProviders } from "tests/setup/test-utils";

describe("Page", () => {
  it("renders header actions through the shared slot", () => {
    renderWithProviders(
      <Page
        title="Dashboard"
        subtitle="Your training home"
        icon={Dumbbell}
        actions={<button type="button">Open help</button>}
      >
        <div>Body content</div>
      </Page>,
    );

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open help" })).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("supports the hero header variant", () => {
    renderWithProviders(
      <Page
        title="Landing"
        subtitle="Built for lifters"
        eyebrow="Public"
        icon={HelpCircle}
        variant="hero"
      />,
    );

    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Landing" })).toHaveClass("text-3xl");
  });
});
