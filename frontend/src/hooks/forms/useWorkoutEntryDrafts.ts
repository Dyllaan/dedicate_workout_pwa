import { useSyncExternalStore } from "react";
import {
  WORKOUT_ENTRY_DRAFTS_CHANGED_EVENT,
  type WorkoutEntryDraftSummary,
  listWorkoutEntryDrafts,
} from "./workoutEntryDraft";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => callback();

  window.addEventListener("storage", handleChange);
  window.addEventListener(WORKOUT_ENTRY_DRAFTS_CHANGED_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(WORKOUT_ENTRY_DRAFTS_CHANGED_EVENT, handleChange);
  };
}

export function useWorkoutEntryDrafts(): WorkoutEntryDraftSummary[] {
  return useSyncExternalStore(subscribe, listWorkoutEntryDrafts, () => []);
}