import { render, screen } from "@testing-library/react";
import { BarChart3 } from "lucide-react";

import StatTile from "@/components/ui/stat-tile";

describe("StatTile", () => {
  it("renders the label and value", () => {
    render(<StatTile label="Suggested weight" value="102.5 kg" icon={BarChart3} />);

    expect(screen.getByText("Suggested weight")).toHaveClass("text-xs", "font-medium", "text-muted-foreground");
    expect(screen.getByText("102.5 kg")).toHaveClass("text-2xl", "sm:text-3xl", "font-semibold", "text-foreground");
  });

  it("applies override classes", () => {
    const { container } = render(
      <StatTile
        label="Rep target"
        value="6-8"
        icon={BarChart3}
        className="bg-background/70"
        labelClassName="tracking-widest"
        valueClassName="text-xl"
      />,
    );

    expect(container.firstChild).toHaveClass("flex", "flex-col", "justify-between", "rounded-2xl", "p-4", "bg-background/70");
    expect(screen.getByText("Rep target")).toHaveClass("tracking-widest");
    expect(screen.getByText("6-8")).toHaveClass("text-xl");
  });

  it("renders supporting text under the value", () => {
    render(
      <StatTile
        label="BEST"
        value="120.0 kg"
        supportingText="best set on 20 May 2026"
        icon={BarChart3}
      />,
    );

    expect(screen.getByText("best set on 20 May 2026")).toHaveClass("text-xs", "text-muted-foreground");
  });
});
