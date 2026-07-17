import { Dumbbell } from "lucide-react";
import { fireEvent, screen } from "@testing-library/react";
import FormPage from "@/components/layout/frames/FormPage";
import { renderWithProviders } from "tests/setup/test-utils";

describe("FormPage", () => {
  it("disables create-mode save when the form is invalid", () => {
    renderWithProviders(
      <FormPage
        icon={Dumbbell}
        title="Create"
        subtitle="New item"
        onSave={vi.fn()}
        isValid={false}
        isSaving={false}
        hasChanges
        isCreateMode
      />,
    );

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("enables save when the create form is valid and changed", () => {
    const onSave = vi.fn();

    renderWithProviders(
      <FormPage
        icon={Dumbbell}
        title="Create"
        subtitle="New item"
        onSave={onSave}
        isValid
        isSaving={false}
        hasChanges
        isCreateMode
      />,
    );

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("renders a single shared action row with reset and save controls", () => {
    const onSave = vi.fn();
    const onReset = vi.fn();

    renderWithProviders(
      <FormPage
        icon={Dumbbell}
        title="Review"
        subtitle="Final step"
        onSave={onSave}
        onReset={onReset}
        isValid
        isSaving={false}
        hasChanges
        saveLabel="Create Workout"
        undoLabel="Reset"
      />,
    );

    expect(screen.getAllByRole("button", { name: "Create Workout" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Workout" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
