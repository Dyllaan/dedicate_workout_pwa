import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorkoutEntryShell from "@/features/workout/entries/components/panels/WorkoutEntryShell";

describe("WorkoutEntryShell", () => {
  it("uses the shared vertical rhythm for its top content block", () => {
    const { container } = render(
      <WorkoutEntryShell
        title="Workout entry"
        subtitle="Start a new workout session"
        hasChanges={false}
        isValid={false}
        submitting={false}
        handleSubmit={() => {}}
        tabs={[{ key: "view", label: "Workout" }]}
        activeTab="view"
        ariaLabel="Workout entry tabs"
        onTabChange={() => {}}
      >
        <div>Content</div>
      </WorkoutEntryShell>,
    );

    expect(screen.getByText("Workout entry")).toBeInTheDocument();
    expect(container.querySelector(".space-y-4.py-4")).toBeTruthy();
  });
});
