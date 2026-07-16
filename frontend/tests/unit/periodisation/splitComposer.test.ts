import { buildBlock, buildProgramme, buildStartupSplit, buildWorkoutTemplate } from "tests/shared/builders";
import { composeSplit } from "@/utils/periodisation/splitComposer";

describe("composeSplit", () => {
  it("orders workouts from assignments and derives frequencies and blocks", () => {
    const workouts = [
      buildWorkoutTemplate({ id: "workout-a", name: "Bench Day", category: "Push" }),
      buildWorkoutTemplate({ id: "workout-b", name: "Pull Day", category: "Pull" }),
    ];
    const split = buildStartupSplit({
      id: "split-a",
      name: "Upper Lower",
      active: true,
      workoutAssignments: [
        {
          id: "assignment-b",
          workoutTemplateId: "workout-b",
          sessionsPerWeek: 9,
          workoutOrder: 0,
        },
        {
          id: "assignment-a",
          workoutTemplateId: "workout-a",
          sessionsPerWeek: 2,
          workoutOrder: 1,
        },
      ],
      programmes: [
        buildProgramme({
          id: "programme-a",
          blocks: [
            buildBlock({ id: "block-a", name: "Accumulation" }),
            buildBlock({ id: "block-b", name: "Intensification", blockOrder: 2 }),
          ],
        }),
      ],
    });

    const composed = composeSplit(split, workouts);

    expect(composed).not.toBeNull();
    expect(composed?.workouts.map((workout) => workout.id)).toEqual(["workout-b", "workout-a"]);
    expect(composed?.workoutFrequencies).toEqual([
      {
        workoutTemplateId: "workout-b",
        workoutTemplateName: "Pull Day",
        sessionsPerWeek: 7,
      },
      {
        workoutTemplateId: "workout-a",
        workoutTemplateName: "Bench Day",
        sessionsPerWeek: 2,
      },
    ]);
    expect(composed?.blocks.map((block) => block.id)).toEqual(["block-a", "block-b"]);
    expect(composed?.programmes).toHaveLength(1);
  });
});
