import { useState } from "react";
import { Target } from "lucide-react";
import Panel from "@/components/layout/frames/Panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import RestTimerOverlay from "./RestTimerOverlay";
import { calculateAttemptPlannedWeight, recalculateOnFail } from "../utils/test1rmUtils";
import type { TestSessionState, TestSessionAction, AttemptVerdict } from "../types/Test1rmTypes";

type AttemptPanelProps = {
  state: TestSessionState;
  dispatch: React.Dispatch<TestSessionAction>;
  format: (kg: number) => string;
};

export default function AttemptPanel({ state, dispatch, format }: AttemptPanelProps) {
  const currentIdx = state.attempts.length - 1;
  const currentAttempt = state.attempts[currentIdx];
  const isAtMax = state.attempts.length >= 3;
  const hasVerdict = state.attempts.some((a) => a.verdict !== "PENDING");
  const currentHasVerdict = currentAttempt?.verdict !== "PENDING";

  const [weightInput, setWeightInput] = useState(
    currentAttempt ? String(currentAttempt.plannedWeightKg) : "",
  );

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
    const num = parseFloat(value);
    if (!isNaN(num)) {
      dispatch({ type: "UPDATE_ATTEMPT_WEIGHT", attemptIdx: currentIdx, weight: num });
    }
  };

  const handleVerdict = (verdict: AttemptVerdict) => {
    const weight = parseFloat(weightInput) || currentAttempt.plannedWeightKg;
    dispatch({
      type: "SAVE_VERDICT",
      weight,
      reps: verdict === "SUCCESS" ? 1 : 0,
      rpe: verdict === "SUCCESS" ? 9 : 10,
      verdict,
      timestamp: Date.now(),
    });
    const nextWeight = verdict === "SUCCESS"
      ? calculateAttemptPlannedWeight(state.e1rmBaselineKg, currentIdx + 2, "kg")
      : recalculateOnFail(state.e1rmBaselineKg, currentIdx + 2, "kg");
    setWeightInput(String(nextWeight));
  };

  const handleAdvance = () => {
    const plannedWeight = parseFloat(weightInput);
    dispatch({
      type: "ADVANCE_TO_NEXT_ATTEMPT",
      plannedWeight: isNaN(plannedWeight) ? undefined : plannedWeight,
    });
    setWeightInput("");
  };

  if (!currentAttempt) return null;

  return (
    <Panel
      title={`Attempt ${currentIdx + 1} of ${Math.min(state.attempts.length + (isAtMax ? 0 : 1), 3)}`}
      icon={Target}
    >
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Weight</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={weightInput}
              onChange={(e) => handleWeightChange(e.target.value)}
              placeholder={currentHasVerdict ? "Weight for next attempt" : format(currentAttempt.plannedWeightKg)}
              className="h-12 w-full rounded-md border bg-background px-4 text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {!currentHasVerdict && (
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => handleVerdict("SUCCESS")}
              disabled={!weightInput}
            >
              Success
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleVerdict("FAIL")}
              disabled={!weightInput}
            >
              Fail
            </Button>
          </div>
        )}

        <RestTimerOverlay
          restStartedAt={state.restStartedAt}
          targetSeconds={state.restDurationTarget}
          onSkip={handleAdvance}
        />

        {currentHasVerdict && !isAtMax && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleAdvance}
          >
            Next Attempt
          </Button>
        )}

        {hasVerdict && !isAtMax && (
          <button
            type="button"
            onClick={() => dispatch({ type: "FINISH_EARLY" })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            Finish testing early
          </button>
        )}
      </div>
    </Panel>
  );
}
