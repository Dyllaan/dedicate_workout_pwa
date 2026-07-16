import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Back from "@/components/layout/section/Back";

describe("Back", () => {
  it("uses the shared shell spacing without the old nested padding", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Back />
      </MemoryRouter>,
    );

    const button = screen.getByTestId("back-button");
    expect(button.className).toContain("flex");
    expect(button.className).toContain("items-center");
    expect(button.className).not.toContain("px-4");
    expect(button.className).not.toContain("pt-4");
  });
});
