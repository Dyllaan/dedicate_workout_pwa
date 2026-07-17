import {
  getExerciseCatalogDisplayMetadata,
  getExerciseCatalogWorkoutVariant,
} from "@/features/heatmap/utils/exerciseCatalog";
import { buildExerciseInfoCatalogItem } from "tests/shared/builders";

describe("exerciseCatalog helpers", () => {
  it("builds metadata for a plain exercise with equipment only", () => {
    const exercise = buildExerciseInfoCatalogItem({
      name: "Bench Press",
      variation: "No",
      equipment: "Barbell",
      mainMuscle: "Chest",
    });

    expect(getExerciseCatalogDisplayMetadata(exercise)).toBe("Barbell | Chest");
    expect(getExerciseCatalogWorkoutVariant(exercise)).toBe("Barbell");
  });

  it("prefers the suffixed name for display but equipment for the saved variant", () => {
    const exercise = buildExerciseInfoCatalogItem({
      name: "Bench Press: Power Lift",
      variation: "Yes",
      equipment: "Barbell",
      mainMuscle: "Chest",
    });

    expect(getExerciseCatalogDisplayMetadata(exercise)).toBe("Power Lift | Barbell | Chest");
    expect(getExerciseCatalogWorkoutVariant(exercise)).toBe("Barbell");
  });

  it("falls back to the parsed suffix when equipment is missing", () => {
    const exercise = buildExerciseInfoCatalogItem({
      name: "Bench Press: Power Lift",
      variation: "Yes",
      equipment: null,
      mainMuscle: "Chest",
    });

    expect(getExerciseCatalogDisplayMetadata(exercise)).toBe("Power Lift | Chest");
    expect(getExerciseCatalogWorkoutVariant(exercise)).toBe("Power Lift");
  });

  it("suppresses duplicate metadata when suffix and equipment match", () => {
    const exercise = buildExerciseInfoCatalogItem({
      name: "Row: Cable",
      variation: "Yes",
      equipment: "Cable",
      mainMuscle: "Back",
    });

    expect(getExerciseCatalogDisplayMetadata(exercise)).toBe("Cable | Back");
    expect(getExerciseCatalogWorkoutVariant(exercise)).toBe("Cable");
  });
});
