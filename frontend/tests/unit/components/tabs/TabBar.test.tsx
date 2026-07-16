import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TabBar from "@/components/tabs/TabBar";

describe("TabBar", () => {
  it("renders active, disabled, and error states", () => {
    render(
      <TabBar
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "programme", label: "Programme", disabled: true },
          { key: "setup", label: "Setup", error: true },
        ]}
        activeTab="overview"
        ariaLabel="Example tabs"
        onTabChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("tablist", { name: "Example tabs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Programme" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("tab", { name: "Setup" })).toHaveAttribute("aria-invalid", "true");
  });

  it("calls onTabChange for enabled tabs and onDisabledTabClick for disabled tabs", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const onDisabledTabClick = vi.fn();

    render(
      <TabBar
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "programme", label: "Programme", disabled: true },
        ]}
        activeTab="overview"
        ariaLabel="Example tabs"
        onTabChange={onTabChange}
        onDisabledTabClick={onDisabledTabClick}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Programme" }));
    expect(onDisabledTabClick).toHaveBeenCalledWith("programme");
    expect(onTabChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: "Overview" }));
    expect(onTabChange).toHaveBeenCalledWith("overview");
  });
});
