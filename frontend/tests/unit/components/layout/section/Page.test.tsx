import { render, screen } from "@testing-library/react";
import { Dumbbell } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import FormPage from "@/components/layout/FormPage";
import Page from "@/components/layout/section/Page";

describe("Page", () => {
  it("applies the shared top padding used by the shell layout", () => {
    const { container } = render(
      <Page title="Overview" icon={Dumbbell}>
        <div>Body</div>
      </Page>,
    );

    expect(container.firstElementChild).toHaveClass("pt-2");
  });
});

describe("FormPage", () => {
  it("keeps the same shared page spacing while rendering form actions", () => {
    const onSave = vi.fn();

    const { container } = render(
      <FormPage
        title="Edit workout"
        icon={Dumbbell}
        hasChanges
        isValid
        onSave={onSave}
      >
        <div>Body</div>
      </FormPage>,
    );

    expect(container.firstElementChild).toHaveClass("pt-2");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
