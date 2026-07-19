import { Check } from "lucide-react";
import Panel from "@/components/layout/frames/Panel";
import { Button } from "@/components/ui/button";
import type { TestSessionState, TestSessionAction } from "../types/Test1rmTypes";

type WarmupPanelProps = {
  state: TestSessionState;
  dispatch: React.Dispatch<TestSessionAction>;
  format: (kg: number) => string;
};

export default function WarmupPanel({ state, dispatch, format }: WarmupPanelProps) {
  const allCompleted = state.warmupSets.every((ws) => ws.completed);

  return (
    <Panel title="Warm-Up" subtitle="Complete each warm-up set before moving to attempts">
      <div className="space-y-2">
        {state.warmupSets.map((ws, i) => (
          <div
            key={i}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
              ws.completed
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <div>
              <span className="text-sm font-semibold">
                {Math.round(ws.percentage * 100)}% — {format(ws.targetWeightKg)}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {ws.targetReps} {ws.targetReps === 1 ? "rep" : "reps"}
              </span>
            </div>
            <Button
              size="sm"
              variant={ws.completed ? "secondary" : "default"}
              onClick={() => dispatch({ type: "COMPLETE_WARMUP", index: i })}
              disabled={ws.completed}
            >
              {ws.completed ? <Check className="h-4 w-4" /> : "Done"}
            </Button>
          </div>
        ))}
      </div>
      <Button
        onClick={() => dispatch({ type: "FINISH_WARMUPS" })}
        disabled={!allCompleted}
        className="w-full mt-3"
      >
        Begin Attempts
      </Button>
    </Panel>
  );
}
