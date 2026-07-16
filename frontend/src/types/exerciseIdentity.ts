type DefinitionExerciseIdentity = {
  kind: "definition";
  exerciseDefinitionId: string;
  exerciseInfoId?: number | null;
  exerciseName: string;
  variant?: string | null;
};

type CatalogExerciseIdentity = {
  kind: "catalog";
  exerciseInfoId: number;
  exerciseName: string;
  variant?: string | null;
};

type CustomExerciseIdentity = {
  kind: "custom";
  exerciseName: string;
  variant?: string | null;
};

export type ExerciseIdentityDraft =
  | DefinitionExerciseIdentity
  | CatalogExerciseIdentity
  | CustomExerciseIdentity;

type FlatExerciseIdentityInput = {
  exerciseDefinitionId?: string | null;
  exerciseInfoId?: number | null;
  exerciseName?: string | null;
  variant?: string | null;
};

export function createExerciseIdentityDraft(
  input: FlatExerciseIdentityInput,
): ExerciseIdentityDraft {
  const exerciseName = input.exerciseName?.trim() ?? "";
  const variant = input.variant ?? null;

  if (input.exerciseDefinitionId) {
    return {
      kind: "definition",
      exerciseDefinitionId: input.exerciseDefinitionId,
      exerciseInfoId: input.exerciseInfoId ?? null,
      exerciseName,
      variant,
    };
  }

  if (input.exerciseInfoId != null) {
    return {
      kind: "catalog",
      exerciseInfoId: input.exerciseInfoId,
      exerciseName,
      variant,
    };
  }

  return {
    kind: "custom",
    exerciseName,
    variant,
  };
}

export function getExerciseIdentityName(identity: ExerciseIdentityDraft) {
  return identity.exerciseName;
}

export function getExerciseIdentityVariant(identity: ExerciseIdentityDraft) {
  return identity.variant ?? null;
}

export function getExerciseIdentityInfoId(identity: ExerciseIdentityDraft) {
  return identity.kind === "custom" ? null : identity.exerciseInfoId ?? null;
}

export function getExerciseIdentityDefinitionId(identity: ExerciseIdentityDraft) {
  return identity.kind === "definition" ? identity.exerciseDefinitionId : null;
}

export function isCustomExerciseIdentity(identity: ExerciseIdentityDraft) {
  return identity.kind === "custom";
}

export function sameExerciseIdentity(
  left: ExerciseIdentityDraft,
  right: ExerciseIdentityDraft,
) {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "definition" && right.kind === "definition") {
    return (
      left.exerciseDefinitionId === right.exerciseDefinitionId &&
      left.exerciseInfoId === right.exerciseInfoId &&
      left.exerciseName === right.exerciseName &&
      (left.variant ?? null) === (right.variant ?? null)
    );
  }

  if (left.kind === "catalog" && right.kind === "catalog") {
    return (
      left.exerciseInfoId === right.exerciseInfoId &&
      left.exerciseName === right.exerciseName &&
      (left.variant ?? null) === (right.variant ?? null)
    );
  }

  return (
    left.exerciseName === right.exerciseName &&
    (left.variant ?? null) === (right.variant ?? null)
  );
}

export function toCreatePayloadFields(identity: ExerciseIdentityDraft) {
  switch (identity.kind) {
    case "definition":
      return {
        exerciseDefinitionId: identity.exerciseDefinitionId,
        exerciseInfoId: identity.exerciseInfoId ?? null,
        exerciseName: identity.exerciseName,
        variant: identity.variant ?? null,
      };
    case "catalog":
      return {
        exerciseInfoId: identity.exerciseInfoId,
        exerciseName: identity.exerciseName,
        variant: identity.variant ?? null,
      };
    case "custom":
      return {
        exerciseName: identity.exerciseName,
        variant: identity.variant ?? null,
      };
  }
}

export function withResolvedDefinition(
  identity: ExerciseIdentityDraft,
  exerciseDefinitionId: string,
): DefinitionExerciseIdentity {
  return {
    kind: "definition",
    exerciseDefinitionId,
    exerciseInfoId: getExerciseIdentityInfoId(identity),
    exerciseName: getExerciseIdentityName(identity),
    variant: getExerciseIdentityVariant(identity),
  };
}
