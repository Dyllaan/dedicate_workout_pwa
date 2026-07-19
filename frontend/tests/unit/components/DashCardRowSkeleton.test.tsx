import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DashCardRowSkeleton } from "@/components/layout/card/DashCardRow";

describe("DashCardRowSkeleton", () => {
  it("renders three skeleton placeholders", () => {
    render(<DashCardRowSkeleton />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons).toHaveLength(4);
  });

  it("uses the same layout container class as DashCardRow", () => {
    const { container } = render(<DashCardRowSkeleton />);
    const row = container.firstElementChild!;
    expect(row.className).toMatch(/flex.*items-center.*justify-between.*gap-3.*py-3/);
  });
});
