import { useEffect, useMemo, useRef, useState } from "react";
import type { SetFormData } from "@/hooks/forms/workoutEntryFormTypes";
import { formatRestTime } from "@/utils/restTime";

type UseRestTimerInput = {
  exerciseIdx: number;
  sets: SetFormData[];
  targetRestSeconds: number;
  handleSetChange: (
    exerciseIdx: number,
    setIdx: number,
    field: "restBeforeSeconds",
    value: string,
  ) => void;
};

function isCompleted(set: SetFormData) {
  const reps = parseInt(set.reps);
  return Number.isFinite(reps) && reps > 0;
}

function getRestSetIndex(sets: SetFormData[]) {
  const lastCompletedIdx = sets.reduce(
    (latest, set, idx) => (isCompleted(set) ? idx : latest),
    -1,
  );
  const nextIdx = lastCompletedIdx + 1;
  if (lastCompletedIdx < 0 || nextIdx >= sets.length || isCompleted(sets[nextIdx]!)) {
    return null;
  }
  return nextIdx;
}

export function useRestTimer({
  exerciseIdx,
  sets,
  targetRestSeconds,
  handleSetChange,
}: UseRestTimerInput) {
  const restSetIndex = useMemo(() => getRestSetIndex(sets), [sets]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const lastRecordedRef = useRef<number | null>(null);

  useEffect(() => {
    if (restSetIndex == null) {
      startedAtRef.current = null;
      lastRecordedRef.current = null;
      setElapsedSeconds(0);
      return;
    }

    startedAtRef.current = Date.now();
    lastRecordedRef.current = null;
    setElapsedSeconds(0);
  }, [restSetIndex]);

  useEffect(() => {
    if (restSetIndex == null || startedAtRef.current == null) {
      return;
    }

    const interval = setInterval(() => {
      const nextElapsed = Math.floor((Date.now() - startedAtRef.current!) / 1000);
      setElapsedSeconds(nextElapsed);
      if (nextElapsed !== lastRecordedRef.current) {
        lastRecordedRef.current = nextElapsed;
        handleSetChange(exerciseIdx, restSetIndex, "restBeforeSeconds", String(nextElapsed));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [exerciseIdx, handleSetChange, restSetIndex]);

  const safeTarget = Math.max(0, Math.round(targetRestSeconds || 90));

  return {
    elapsedSeconds,
    targetRestSeconds: safeTarget,
    restSetIndex,
    isActive: restSetIndex != null,
    isOverTarget: elapsedSeconds > safeTarget,
    displayLabel: `${formatRestTime(elapsedSeconds)} / ${formatRestTime(safeTarget)}`,
  };
}
