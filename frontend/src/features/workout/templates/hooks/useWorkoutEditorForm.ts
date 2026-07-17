import { useEffect, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "@/lib/zod";
import type {
  CreateWorkoutTemplateRequest,
  UpdateWorkoutTemplateRequest,
  WorkoutTemplate,
} from "@/features/workout/types/Workout";
import type { ExerciseInfoCatalogItem } from "@/features/heatmap/types/Heatmap";
import { getExerciseCatalogWorkoutVariant } from "@/features/heatmap/utils/exerciseCatalog";
import { WORKOUT_CATEGORIES } from "@/features/workout/exercise-definitions/config/common";
import {
getStringValidationMessage,
  isInvalidSets,
  isInvalidString,
} from "@/utils/validator";
import {
  createExerciseIdentityDraft,
  getExerciseIdentityInfoId,
  getExerciseIdentityName,
  getExerciseIdentityVariant,
  toCreatePayloadFields,
} from "@/features/workout/entries/types/ExerciseIdentity";

const identitySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("definition"),
    exerciseDefinitionId: z.string().min(1, "Exercise definition is required"),
    exerciseInfoId: z.number().nullable().optional(),
    exerciseName: z.string().min(1, "Exercise name is required"),
    variant: z.string().nullable().optional(),
  }),
  z.object({
    kind: z.literal("catalog"),
    exerciseInfoId: z.number(),
    exerciseName: z.string().min(1, "Exercise name is required"),
    variant: z.string().nullable().optional(),
  }),
  z.object({
    kind: z.literal("custom"),
    exerciseName: z.string().min(1, "Exercise name is required"),
    variant: z.string().nullable().optional(),
  }),
]);

const baseExerciseSchema = z.object({
  identity: identitySchema,
  goalSets: z
    .number()
    .int("Must be a whole number")
    .positive("Must be greater than 0")
    .refine((value) => !isInvalidSets(value), "Invalid number of sets"),
  exerciseConfigId: z.string().nullable().optional(),
  focus: z.boolean().optional(),
  targetRestSeconds: z
    .number()
    .int("Must be a whole number")
    .min(0, "Must be 0 or more")
    .max(7200, "Must be 7200 seconds or less")
    .nullable()
    .optional(),
});

function addExerciseIssue(
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  message: string,
) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  });
}

function addStringValidationIssue(
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  label: string,
  value: string,
) {
  const message = getStringValidationMessage(label, value);
  if (message) {
    addExerciseIssue(ctx, path, message);
  }
}

const exerciseSchema = baseExerciseSchema.superRefine((exercise, ctx) => {
  const identity = exercise.identity;
  const isCatalogBacked = identity.kind !== "custom";

  if (isCatalogBacked) {
    if (getExerciseIdentityInfoId(identity) == null) {
      addExerciseIssue(
        ctx,
        ["identity", "exerciseInfoId"],
        "Catalog exercise metadata is required",
      );
    }

    if (getExerciseIdentityName(identity).trim().length === 0) {
      addExerciseIssue(ctx, ["identity", "exerciseName"], "Exercise name is required");
    }

    return;
  }

  if (getExerciseIdentityName(identity).length > 0 && isInvalidString(getExerciseIdentityName(identity))) {
    addStringValidationIssue(
      ctx,
      ["identity", "exerciseName"],
      "Exercise name",
      getExerciseIdentityName(identity),
    );
  }

  const variant = getExerciseIdentityVariant(identity) ?? "";
  if (variant !== "" && isInvalidString(variant)) {
    addStringValidationIssue(ctx, ["identity", "variant"], "Variant", variant);
  }
});

const workoutEditorSchema = z.object({
  workoutName: z.string().min(1, "Workout name is required").superRefine((value, ctx) => {
    if (value.length > 0 && isInvalidString(value)) {
      const message = getStringValidationMessage("Workout name", value);
      if (message) {
        addExerciseIssue(ctx, ["workoutName"], message);
      }
    }
  }),
  workoutCategory: z.string().min(1, "Workout type is required").superRefine((value, ctx) => {
    if (value.length > 0 && isInvalidString(value)) {
      const message = getStringValidationMessage("Workout type", value);
      if (message) {
        addExerciseIssue(ctx, ["workoutCategory"], message);
      }
    }
  }),
  exercises: z.array(exerciseSchema).min(1, "At least one exercise is required"),
});

export type WorkoutEditorExerciseValues = z.infer<typeof exerciseSchema>;
export type WorkoutEditorValues = z.infer<typeof workoutEditorSchema>;

type UseWorkoutEditorFormOptions = {
  defaultValues: WorkoutEditorValues;
  resetKey: string;
  onSubmit: (values: WorkoutEditorValues) => Promise<void> | void;
};

function dedupeOptions(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeGoalSets(goalSets: number | undefined, fallback = 3) {
  return typeof goalSets === "number" && Number.isFinite(goalSets) && goalSets > 0
    ? goalSets
    : fallback;
}

function logWorkoutEditorFormEvent(
  event: string,
  details: Record<string, unknown>,
) {
  console.info("[WorkoutEditorForm]", event, details);
}

function normalizeExercise(exercise?: {
  exerciseDefinition?: {
    id?: string | null;
    exerciseName?: string;
    variant?: string | null;
    exerciseInfoId?: number | null;
  };
  goalSets?: number;
  exerciseDefinitionId?: string | null;
  exerciseConfigId?: string | null;
  focus?: boolean | null;
  targetRestSeconds?: number | null;
}) {
  return {
    identity: createExerciseIdentityDraft({
      exerciseDefinitionId: exercise?.exerciseDefinition?.id ?? null,
      exerciseInfoId: exercise?.exerciseDefinition?.exerciseInfoId ?? null,
      exerciseName: exercise?.exerciseDefinition?.exerciseName ?? "",
      variant: exercise?.exerciseDefinition?.variant ?? null,
    }),
    goalSets: normalizeGoalSets(exercise?.goalSets),
    exerciseConfigId: exercise?.exerciseConfigId ?? null,
    focus: exercise?.focus ?? false,
    targetRestSeconds: exercise?.targetRestSeconds ?? null,
  };
}

export function createEmptyWorkoutEditorValues(): WorkoutEditorValues {
  return {
    workoutName: "",
    workoutCategory: "",
    exercises: [],
  };
}

export function workoutTemplateToEditorValues(
  workout: WorkoutTemplate,
): WorkoutEditorValues {
  return {
    workoutName: workout.name,
    workoutCategory: workout.category,
    exercises: workout.exercises.map(normalizeExercise),
  };
}

export function editorValuesToCreateWorkoutPayload(
  values: WorkoutEditorValues,
): CreateWorkoutTemplateRequest {
  return {
    name: values.workoutName.trim(),
    category: values.workoutCategory.trim(),
    exercises: values.exercises.map((exercise) => {
      const fields = toCreatePayloadFields(exercise.identity);

      return {
        exerciseConfigId: exercise.exerciseConfigId ?? null,
        exerciseDefinitionId: fields.exerciseDefinitionId ?? null,
        exerciseName: fields.exerciseName.trim(),
        goalSets: exercise.goalSets,
        variant: fields.variant?.trim() || null,
        goalReps: null,
        exerciseInfoId: fields.exerciseInfoId ?? null,
        progressionMode: null,
        primaryBenchmark: null,
        targetRestSeconds: exercise.targetRestSeconds ?? null,
        focus: exercise.focus ?? false,
      };
    }),
  };
}

export function editorValuesToUpdateWorkoutPayload(
  values: WorkoutEditorValues,
): UpdateWorkoutTemplateRequest {
  return editorValuesToCreateWorkoutPayload(values);
}

export default function useWorkoutEditorForm({
  defaultValues,
  resetKey,
  onSubmit,
}: UseWorkoutEditorFormOptions) {
  const submitAttempted = useRef(false);

  const form = useForm<WorkoutEditorValues>({
    resolver: zodResolver(workoutEditorSchema),
    mode: "onChange",
    defaultValues,
  });

  const { fields, append, move, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  useEffect(() => {
    submitAttempted.current = false;
    form.reset(defaultValues);
  }, [form, resetKey]);

  const shouldShowError = (isTouched: boolean, hasError: boolean) =>
    hasError && (isTouched || submitAttempted.current);

  const addExercise = (
    values: Partial<WorkoutEditorExerciseValues> = {},
  ): number => {
    const nextIndex = form.getValues("exercises").length;
    const draft = {
      identity: values.identity ?? createExerciseIdentityDraft({}),
      goalSets: normalizeGoalSets(values.goalSets),
      exerciseConfigId: values.exerciseConfigId ?? null,
      focus: values.focus ?? false,
      targetRestSeconds: values.targetRestSeconds ?? null,
    };

    logWorkoutEditorFormEvent("append exercise", {
      nextIndex,
      draft,
      currentCount: form.getValues("exercises").length,
    });

    append(draft);

    return nextIndex;
  };

  const removeExercise = (exerciseIndex: number) => {
    if (fields.length > 0) {
      remove(exerciseIndex);
    }
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (fromIndex !== toIndex) {
      move(fromIndex, toIndex);
    }
  };

  const stepGoalSets = (exerciseIndex: number, direction: "up" | "down") => {
    const current = form.getValues(`exercises.${exerciseIndex}.goalSets`);
    const next = direction === "up" ? current + 1 : Math.max(1, current - 1);
    form.setValue(`exercises.${exerciseIndex}.goalSets`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const isExerciseValid = (exerciseIndex: number) => {
    const exercise = form.getValues(`exercises.${exerciseIndex}`);
    const errors = form.formState.errors.exercises?.[exerciseIndex];
    const isCatalogBacked = exercise.identity.kind !== "custom";

    return (
      getExerciseIdentityName(exercise.identity).trim() !== "" &&
      exercise.goalSets > 0 &&
      (isCatalogBacked ? getExerciseIdentityInfoId(exercise.identity) != null : true) &&
      (!errors || (!errors.identity && !errors.goalSets))
    );
  };

  const validateDetails = async () => {
    submitAttempted.current = true;
    return form.trigger(["workoutName", "workoutCategory"]);
  };

  const validateExercise = async (exerciseIndex: number) => {
    submitAttempted.current = true;
    return form.trigger(`exercises.${exerciseIndex}`);
  };

  const isExerciseBlank = (exerciseIndex: number) => {
    const exercise = form.getValues(`exercises.${exerciseIndex}`);

    return (
      getExerciseIdentityName(exercise.identity).trim() === "" &&
      (getExerciseIdentityVariant(exercise.identity) ?? "").trim() === "" &&
      exercise.goalSets === 3
    );
  };

  const hasValidExercise = () =>
    form
      .getValues("exercises")
      .some((_, index) => isExerciseValid(index));

  const areAllExercisesValid = () => {
    const exercises = form.getValues("exercises");

    return exercises.length > 0 && exercises.every((_, index) => isExerciseValid(index));
  };

  const categoryOptions = dedupeOptions([
    ...WORKOUT_CATEGORIES,
    form.watch("workoutCategory"),
  ]);
  const exerciseOptions = dedupeOptions(
    form.watch("exercises").map((exercise) => getExerciseIdentityName(exercise.identity)),
  );

  const linkExercise = (exerciseIndex: number, exercise: ExerciseInfoCatalogItem) => {
    form.setValue(`exercises.${exerciseIndex}.identity`, createExerciseIdentityDraft({
      exerciseInfoId: exercise.id,
      exerciseName: exercise.name,
      variant: getExerciseCatalogWorkoutVariant(exercise),
    }), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const unlinkExercise = (exerciseIndex: number) => {
    const current = form.getValues(`exercises.${exerciseIndex}.identity`);
    form.setValue(`exercises.${exerciseIndex}.identity`, createExerciseIdentityDraft({
      exerciseName: getExerciseIdentityName(current),
      variant: getExerciseIdentityVariant(current),
    }), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const setExerciseFocus = (exerciseIndex: number, focus: boolean) => {
    const exercises = form.getValues("exercises");

    exercises.forEach((_, index) => {
      form.setValue(`exercises.${index}.focus`, index === exerciseIndex ? focus : false, {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  };

  const handleSubmitClick = async () => {
    submitAttempted.current = true;
    logWorkoutEditorFormEvent("submit attempt", {
      isDirty: form.formState.isDirty,
      isValid: form.formState.isValid,
      exerciseCount: form.getValues("exercises").length,
      errors: form.formState.errors,
    });

    await form.handleSubmit(
      onSubmit,
      (errors) => {
        logWorkoutEditorFormEvent("submit blocked", {
          errorKeys: Object.keys(errors),
          errors,
        });
      },
    )();
  };

  const resetForm = () => {
    submitAttempted.current = false;
    form.reset(defaultValues);
  };

  return {
    form,
    fields,
    categoryOptions,
    exerciseOptions,
    shouldShowError,
    addExercise,
    linkExercise,
    unlinkExercise,
    removeExercise,
    moveExercise,
    setExerciseFocus,
    stepGoalSets,
    isExerciseValid,
    validateDetails,
    validateExercise,
    isExerciseBlank,
    hasValidExercise,
    areAllExercisesValid,
    handleSubmitClick,
    resetForm,
  };
}

export type WorkoutEditorController = ReturnType<typeof useWorkoutEditorForm>;