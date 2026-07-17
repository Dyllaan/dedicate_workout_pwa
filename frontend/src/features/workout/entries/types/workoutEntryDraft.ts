import {
  type ReadinessFormState,
  type WorkoutEntryExerciseDraft,
  type WorkoutEntrySetDraft,
} from "./workoutEntryFormTypes";
import { createExerciseIdentityDraft } from "@/features/workout/entries/types/ExerciseIdentity";

const DRAFT_VERSION = 6;
const DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const WORKOUT_ENTRY_DRAFTS_CHANGED_EVENT = "workout-entry-drafts-changed";

type WorkoutEntryDraft = {
  exerciseData: WorkoutEntryExerciseDraft[];
  readiness: ReadinessFormState | null;
  readinessIncluded: boolean;
  workoutTemplateName: string;
};

type DraftPayload = {
  version: typeof DRAFT_VERSION;
  savedAt: number;
  workoutTemplateName?: string;
} & WorkoutEntryDraft;

type LegacyDraftPayload = {
  version: 4 | 5;
  savedAt: number;
  exerciseData: Array<{
    sortId: string;
    exerciseName: string;
    variant?: string | null;
    exerciseDefinitionId?: string | null;
    exerciseInfoId?: number | null;
    goalSets: number;
    targetRestSeconds?: number | null;
    sets: WorkoutEntrySetDraft[];
  }>;
};

function getDraftKey(templateId: string | number) {
  return `workout-draft-${templateId}`;
}

function notifyWorkoutEntryDraftsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(WORKOUT_ENTRY_DRAFTS_CHANGED_EVENT));
}

function isValidDraftSet(set: unknown): set is WorkoutEntrySetDraft {
  return (
    typeof set === "object" &&
    set !== null &&
    "reps" in set &&
    typeof set.reps === "string" &&
    "weight" in set &&
    typeof set.weight === "string" &&
    "rpe" in set &&
    typeof set.rpe === "string"
  );
}

function isValidDraftExercise(exercise: unknown): exercise is WorkoutEntryExerciseDraft {
  return (
    typeof exercise === "object" &&
    exercise !== null &&
    "sortId" in exercise &&
    typeof exercise.sortId === "string" &&
    "identity" in exercise &&
    typeof exercise.identity === "object" &&
    exercise.identity !== null &&
    "exerciseName" in exercise.identity &&
    typeof exercise.identity.exerciseName === "string" &&
    "goalSets" in exercise &&
    typeof exercise.goalSets === "number" &&
    "sets" in exercise &&
    Array.isArray(exercise.sets) &&
    exercise.sets.every(isValidDraftSet)
  );
}

function isValidReadinessForm(readiness: unknown): readiness is ReadinessFormState {
  if (typeof readiness !== "object" || readiness === null) {
    return false;
  }

  const candidate = readiness as Record<string, unknown>;

  return (
    typeof candidate.sleepQuality === "number" &&
    typeof candidate.stressLevel === "number" &&
    typeof candidate.sorenessLevel === "number" &&
    typeof candidate.confidenceLevel === "number"
  );
}

type LoadedDraft = {
  draft: WorkoutEntryDraft;
  needsUpgrade: boolean;
  savedAt: number;
} | null;

export type WorkoutEntryDraftSummary = {
  templateId: string;
  templateName: string;
  savedAt: number;
  draft: WorkoutEntryDraft;
};

let lastDraftSnapshotKey = "";
let lastDraftSnapshot: WorkoutEntryDraftSummary[] = [];

function readWorkoutEntryDraft(raw: string): LoadedDraft {
  try {
    const payload: DraftPayload | LegacyDraftPayload = JSON.parse(raw);

    if (payload.version === 4 || payload.version === 5) {
      if (
        typeof payload.savedAt !== "number" ||
        Date.now() - payload.savedAt > DRAFT_TTL_MS ||
        !Array.isArray(payload.exerciseData) ||
        !payload.exerciseData.every((exercise) =>
          typeof exercise === "object" &&
          exercise !== null &&
          typeof exercise.sortId === "string" &&
          typeof exercise.exerciseName === "string" &&
          typeof exercise.goalSets === "number" &&
          Array.isArray(exercise.sets) &&
          exercise.sets.every(isValidDraftSet),
        )
      ) {
        return null;
      }

      return {
        draft: {
          exerciseData: payload.exerciseData.map((exercise) => ({
            sortId: exercise.sortId,
            identity: createExerciseIdentityDraft({
              exerciseDefinitionId: exercise.exerciseDefinitionId ?? null,
              exerciseInfoId: exercise.exerciseInfoId ?? null,
              exerciseName: exercise.exerciseName,
              variant: exercise.variant ?? null,
            }),
            goalSets: exercise.goalSets,
            targetRestSeconds: exercise.targetRestSeconds ?? null,
            sets: exercise.sets,
          })),
          readiness: null,
          readinessIncluded: true,
          workoutTemplateName: "Workout",
        },
        needsUpgrade: true,
        savedAt: payload.savedAt,
      };
    }

    if (payload.version !== DRAFT_VERSION) {
      return null;
    }

    if (typeof payload.savedAt !== "number" || Date.now() - payload.savedAt > DRAFT_TTL_MS) {
      return null;
    }

    if (!Array.isArray(payload.exerciseData) || !payload.exerciseData.every(isValidDraftExercise)) {
      return null;
    }

    if (!("readinessIncluded" in payload) || typeof payload.readinessIncluded !== "boolean") {
      return null;
    }

    if (payload.readiness !== null && !isValidReadinessForm(payload.readiness)) {
      return null;
    }

    const workoutTemplateName =
      typeof payload.workoutTemplateName === "string" && payload.workoutTemplateName.trim().length > 0
        ? payload.workoutTemplateName.trim()
        : "Workout";

    return {
      draft: {
        exerciseData: payload.exerciseData,
        readiness: payload.readiness ?? null,
        readinessIncluded: payload.readinessIncluded,
        workoutTemplateName,
      },
      needsUpgrade: false,
      savedAt: payload.savedAt,
    };
  } catch {
    return null;
  }
}

export function listWorkoutEntryDrafts(): WorkoutEntryDraftSummary[] {
  const drafts: WorkoutEntryDraftSummary[] = [];

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(`workout-draft-`)) {
        continue;
      }

      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      const loadedDraft = readWorkoutEntryDraft(raw);
      if (!loadedDraft) {
        continue;
      }

      drafts.push({
        templateId: key.slice(`workout-draft-`.length),
        templateName: loadedDraft.draft.workoutTemplateName,
        savedAt: loadedDraft.savedAt,
        draft: loadedDraft.draft,
      });
    }
  } catch {
    return [];
  }

  drafts.sort((left, right) => right.savedAt - left.savedAt);

  const snapshotKey = drafts.map((draft) => `${draft.templateId}:${draft.savedAt}`).join("|");
  if (snapshotKey === lastDraftSnapshotKey) {
    return lastDraftSnapshot;
  }

  lastDraftSnapshotKey = snapshotKey;
  lastDraftSnapshot = drafts;

  return drafts;
}

export function saveWorkoutEntryDraft(
  templateId: string | number,
  draft: WorkoutEntryDraft,
) {
  try {
    const payload: DraftPayload = {
      version: DRAFT_VERSION,
      savedAt: Date.now(),
      exerciseData: draft.exerciseData,
      readiness: draft.readiness,
      readinessIncluded: draft.readinessIncluded,
      workoutTemplateName: draft.workoutTemplateName,
    };
    localStorage.setItem(getDraftKey(templateId), JSON.stringify(payload));
    notifyWorkoutEntryDraftsChanged();
  } catch {
    // localStorage full or unavailable so silently ignore
  }
}

export function clearWorkoutEntryDraft(templateId: string | number) {
  try {
    localStorage.removeItem(getDraftKey(templateId));
    notifyWorkoutEntryDraftsChanged();
  } catch {
    // localStorage unavailable, nothing to clear.
  }
}

export function loadWorkoutEntryDraft(
  templateId: string | number,
): WorkoutEntryDraft | null {
  const draftKey = getDraftKey(templateId);

  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) {
      return null;
    }

    const loadedDraft = readWorkoutEntryDraft(raw);
    if (!loadedDraft) {
      clearWorkoutEntryDraft(templateId);
      return null;
    }

    if (loadedDraft.needsUpgrade) {
      saveWorkoutEntryDraft(templateId, loadedDraft.draft);
    }

    return loadedDraft.draft;
  } catch {
    clearWorkoutEntryDraft(templateId);
    return null;
  }
}