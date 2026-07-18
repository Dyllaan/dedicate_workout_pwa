import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StatTileSkeleton } from "@/components/ui/StatGridSkeleton";

describe("StatTileSkeleton", () => {
  it("renders two skeleton placeholders", () => {
    render(<StatTileSkeleton />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons).toHaveLength(2);
  });

  it("uses the same card structure as StatTile", () => {
    const { container } = render(<StatTileSkeleton />);
    const card = container.firstElementChild!;
    expect(card.className).toMatch(/rounded-2xl/);
    expect(card.className).toMatch(/border/);
    expect(card.className).toMatch(/p-4/);
  });
});
