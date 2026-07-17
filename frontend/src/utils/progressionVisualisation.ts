export type TrackingStatus = "ON_TRACK" | "AHEAD" | "BEHIND" | "COMPLETED";

export const STATUS_BAR_COLOR: Record<TrackingStatus, string> = {
  COMPLETED: "bg-green-600",
  AHEAD: "bg-amber-500",
  ON_TRACK: "bg-blue-500",
  BEHIND: "bg-red-500",
};

// Generic messages completely decoupled from domain contexts
export const STATUS_MESSAGES: Record<TrackingStatus, string> = {
  COMPLETED: "Great job! You've met your target.",
  AHEAD: "You've exceeded your target, make sure to manage your fatigue.",
  ON_TRACK: "Looking good! You're on track to hit your target.",
  BEHIND: "You are currently behind your target, try to close the gap.",
};

interface ProgressMetricsOptions {
  actual: number;
  target: number;
  overrideStatus?: TrackingStatus; 
}

export function getProgressionVisualisation({ actual, target, overrideStatus }: ProgressMetricsOptions) {
  // 1. Handle edge-case where no activity or targets exist
  if (actual === 0 && target === 0) {
    return {
      status: null,
      isAhead: false,
      completionPct: 0,
      basePct: 0,
      overagePct: 0,
      targetPct: 0,
      barColor: "bg-muted",
      message: "No data logged yet.",
    };
  }

  // 2. Determine status automatically if not explicitly provided
  let status: TrackingStatus = "ON_TRACK";
  
  if (overrideStatus) {
    status = overrideStatus;
  } else if (target > 0) {
    if (actual >= target) {
      status = actual > target ? "AHEAD" : "COMPLETED";
    } else {
      // "On track" if you're within hitting distance (e.g., >= 70%), otherwise behind
      status = actual / target >= 0.70 ? "ON_TRACK" : "BEHIND";
    }
  }

  const isAhead = status === "AHEAD";

  // 3. Pure raw completion percentage (e.g., 1 / 4 = 25%)
  const completionPct = target > 0 ? (actual / target) * 100 : 0;

  // 4. UI-scaled widths for layered progress bars
  const baseValue = isAhead ? target : actual;
  const overageValue = isAhead ? actual - target : 0;
  const localMaxVal = Math.max(target, actual, 1) * 1.15;

  const basePct = (baseValue / localMaxVal) * 100;
  const overagePct = (overageValue / localMaxVal) * 100;
  const targetPct = (target / localMaxVal) * 100;

  return {
    status,
    isAhead,
    completionPct,
    basePct,
    overagePct,
    targetPct,
    barColor: STATUS_BAR_COLOR[status],
    message: STATUS_MESSAGES[status], // <-- Pure status message
  };
}