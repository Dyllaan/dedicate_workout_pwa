import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Trophy, Flame } from "lucide-react";
import Panel from "@/components/layout/frames/Panel";
import { Button } from "@/components/ui/button";
import StatTile from "@/components/ui/stat-tile";
import StatGrid from "@/components/ui/StatGrid";
import { estimate1RM } from "@/features/workout/entries/utils/1rmEstimateHelper";
import { useCompleteTestSession } from "../hooks/useCompleteTestSession";
import { useProgrammeDeload } from "../hooks/useProgrammeDeload";
import type { TestSessionState, TestSessionAction } from "../types/Test1rmTypes";

type CompletionPanelProps = {
  state: TestSessionState;
  dispatch: React.Dispatch<TestSessionAction>;
  workoutTemplateId: string;
  format: (kg: number) => string;
};

export default function CompletionPanel({
  state,
  workoutTemplateId,
  format,
}: CompletionPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const deloadInfo = location.state as
    | { nextWeekId: string; nextWeekTargetSets: number }
    | null
    | undefined;
  const { complete } = useCompleteTestSession();
  const { applyDeload } = useProgrammeDeload();

  const bestAttempt = state.attempts
    .filter((a) => a.verdict === "SUCCESS")
    .reduce(
      (best, a) => ((a.actualWeightKg ?? 0) > (best?.actualWeightKg ?? 0) ? a : best),
      null as typeof state.attempts[number] | null,
    );

  const newE1rm = bestAttempt
    ? (() => {
        const { epley, brzycki, lombardi } = estimate1RM(
          bestAttempt.actualWeightKg!,
          bestAttempt.actualReps ?? 1,
        );
        const median = Math.max(
          Math.min(epley, brzycki),
          Math.min(Math.max(epley, brzycki), lombardi),
        );
        return Math.round(median * 100) / 100;
      })()
    : null;

  const delta = newE1rm !== null ? newE1rm - state.e1rmBaselineKg : null;

  useEffect(() => {
    const save = async () => {
      try {
        await complete(state, workoutTemplateId);
        if (deloadInfo?.nextWeekId) {
          await applyDeload(deloadInfo.nextWeekId, deloadInfo.nextWeekTargetSets);
        }
      } catch {
        // Errors already shown via snackbar in hooks
      }
    };
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Panel title="Test Complete" icon={Trophy} subtitle="Your results">
      <StatGrid>
        {bestAttempt && (
          <StatTile
            label="Best Lift"
            value={format(bestAttempt.actualWeightKg!)}
            icon={Trophy}
          />
        )}
        {newE1rm !== null && (
          <StatTile
            label="New E1RM"
            value={`${newE1rm} kg`}
            icon={Flame}
          />
        )}
        {delta !== null && (
          <StatTile
            label="Improvement"
            value={`${delta > 0 ? "+" : ""}${delta} kg`}
            supportingText={delta > 0 ? "From previous baseline" : "No change from baseline"}
          />
        )}
      </StatGrid>

      {deloadInfo ? (
        <p className="text-sm text-muted-foreground">
          Recovery week scheduled — volume reduced for the next 7 days.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No upcoming week to deload — take a light week manually.
        </p>
      )}

      <Button
        onClick={() => navigate(-1)}
        className="w-full"
      >
        Back to Programme
      </Button>
    </Panel>
  );
}
