import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Panel from "@/components/layout/frames/Panel";
import StatTile from "@/components/ui/stat-tile";
import StatGrid from "@/components/ui/StatGrid";
import { use1rmBaseline } from "../hooks/use1rmBaseline";
import type { TestSessionState, TestSessionAction } from "../types/Test1rmTypes";
import { createExerciseIdentityDraft } from "@/features/workout/entries/types/ExerciseIdentity";
import type { ExerciseConfig, ExerciseDefinition } from "@/features/workout/types/Workout";

type TestSetupPanelProps = {
  state: TestSessionState;
  dispatch: React.Dispatch<TestSessionAction>;
  exercises: (ExerciseConfig & { exerciseDefinition: ExerciseDefinition })[];
};

export default function TestSetupPanel({ dispatch, exercises }: TestSetupPanelProps) {
  const focusExercise = exercises.find((ex) => ex.focus) ?? exercises[0];
  const exerciseDefId = focusExercise?.exerciseDefinition?.id ?? undefined;
  const { data: e1rm, isLoading } = use1rmBaseline(exerciseDefId);

  const handleStart = () => {
    if (!focusExercise || !e1rm) return;
    const def = focusExercise.exerciseDefinition;
    const exercise = createExerciseIdentityDraft({
      exerciseDefinitionId: def?.id,
      exerciseInfoId: def?.exerciseInfoId,
      exerciseName: def?.exerciseName ?? "",
      variant: def?.variant,
    });
    dispatch({ type: "INIT_SESSION", e1rm, exercise: exercise as TestSessionState["focusExercise"] });
  };

  return (
    <Panel title="Setup" icon={Dumbbell} subtitle="Select your lift and review your baseline 1RM estimate">
      <StatGrid>
        <StatTile
          label="Estimated 1RM"
          value={isLoading ? "..." : e1rm ? `${e1rm} kg` : "No data"}
          icon={Dumbbell}
        />
      </StatGrid>
      {exercises.length > 1 && !focusExercise && (
        <p className="text-xs text-muted-foreground">
          Select a target exercise to begin the test protocol.
        </p>
      )}
      <Button
        onClick={handleStart}
        disabled={!e1rm || !focusExercise}
        className="w-full"
      >
        Start 1RM Test
      </Button>
      {!e1rm && !isLoading && (
        <p className="text-xs text-muted-foreground text-center">
          No historical data for this lift. Log at least one session to auto-calculate baseline.
        </p>
      )}
    </Panel>
  );
}
