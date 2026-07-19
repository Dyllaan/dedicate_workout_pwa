import { useState, useEffect, useRef } from "react";
import { formatRestTime } from "@/features/workout/entries/utils/restTime";

export function useTestRestTimer(
  restStartedAt: number | null,
  targetSeconds: number,
) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const resetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (restStartedAt === null) {
      setElapsedSeconds(0);
      return;
    }

    const key = String(restStartedAt);
    if (key !== resetKeyRef.current) {
      resetKeyRef.current = key;
      setElapsedSeconds(0);
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - restStartedAt) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [restStartedAt]);

  const safeTarget = Math.max(0, Math.round(targetSeconds));
  const isActive = restStartedAt !== null;
  const isOverTarget = isActive && elapsedSeconds > safeTarget;

  return {
    elapsedSeconds,
    isActive,
    isOverTarget,
    displayLabel: `${formatRestTime(elapsedSeconds)} / ${formatRestTime(safeTarget)}`,
  };
}
