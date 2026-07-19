import { useReducer } from "react";
import type { TestSessionState, TestSessionAction } from "../types/Test1rmTypes";
import {
  buildWarmupSets,
  calculateAttemptPlannedWeight,
  recalculateOnFail,
} from "../utils/test1rmUtils";

const REST_DURATION_TARGET = 180; // 3 minutes default

function initialSessionState(): TestSessionState {
  return {
    phase: "SETUP",
    focusExercise: { kind: "custom", exerciseName: "" },
    e1rmBaselineKg: 0,
    warmupSets: [],
    attempts: [],
    restStartedAt: null,
    restDurationTarget: REST_DURATION_TARGET,
  };
}

function testSessionReducer(
  state: TestSessionState,
  action: TestSessionAction,
): TestSessionState {
  switch (action.type) {
    case "INIT_SESSION": {
      return {
        ...state,
        phase: "WARM_UP",
        focusExercise: action.exercise,
        e1rmBaselineKg: action.e1rm,
        warmupSets: buildWarmupSets(action.e1rm, "kg"),
        attempts: [],
        restStartedAt: null,
      };
    }

    case "COMPLETE_WARMUP": {
      const warmupSets = state.warmupSets.map((ws, i) =>
        i === action.index ? { ...ws, completed: true } : ws,
      );
      return { ...state, warmupSets };
    }

    case "FINISH_WARMUPS": {
      const firstPlannedWeight = calculateAttemptPlannedWeight(
        state.e1rmBaselineKg,
        1,
        "kg",
      );
      return {
        ...state,
        phase: "TESTING",
        attempts: [
          {
            attemptNumber: 1,
            plannedWeightKg: firstPlannedWeight,
            actualWeightKg: null,
            actualReps: null,
            actualRpe: null,
            verdict: "PENDING",
          },
        ],
      };
    }

    case "SAVE_VERDICT": {
      const currentIdx = state.attempts.length - 1;
      const attempts = state.attempts.map((a, i) =>
        i === currentIdx
          ? {
              ...a,
              actualWeightKg: action.weight,
              actualReps: action.reps,
              actualRpe: action.rpe,
              verdict: action.verdict,
            }
          : a,
      );
      return { ...state, attempts, restStartedAt: action.timestamp };
    }

    case "UPDATE_ATTEMPT_WEIGHT": {
      const attempts = state.attempts.map((a, i) =>
        i === action.attemptIdx
          ? { ...a, plannedWeightKg: action.weight }
          : a,
      );
      return { ...state, attempts };
    }

    case "ADVANCE_TO_NEXT_ATTEMPT": {
      const prevAttempt = state.attempts[state.attempts.length - 1];
      const attemptNumber = state.attempts.length + 1;
      const isSuccess = prevAttempt.verdict === "SUCCESS";

      const nextPlannedWeight = action.plannedWeight ?? (
        isSuccess
          ? calculateAttemptPlannedWeight(state.e1rmBaselineKg, attemptNumber, "kg")
          : recalculateOnFail(state.e1rmBaselineKg, attemptNumber, "kg")
      );

      const newAttempt = {
        attemptNumber,
        plannedWeightKg: nextPlannedWeight,
        actualWeightKg: null,
        actualReps: null,
        actualRpe: null,
        verdict: "PENDING" as const,
      };

      const phase = attemptNumber >= 3 ? "COMPLETED" as const : "TESTING" as const;
      return {
        ...state,
        phase,
        attempts: [...state.attempts, newAttempt],
        restStartedAt: null,
      };
    }

    case "FINISH_EARLY": {
      return { ...state, phase: "COMPLETED" };
    }

    case "RESET": {
      return initialSessionState();
    }

    default:
      return state;
  }
}

export function use1rmTestReducer() {
  const [state, dispatch] = useReducer(testSessionReducer, null, initialSessionState);
  return { state, dispatch } as const;
}
