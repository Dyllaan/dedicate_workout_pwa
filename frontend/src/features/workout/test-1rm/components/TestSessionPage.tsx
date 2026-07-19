import useWorkoutContext from "@/features/workout/hooks/useWorkoutContext";
import Page from "@/components/layout/frames/Page";
import { use1rmTestReducer } from "../hooks/use1rmTestReducer";
import TestSetupPanel from "./TestSetupPanel";
import WarmupPanel from "./WarmupPanel";
import AttemptPanel from "./AttemptPanel";
import CompletionPanel from "./CompletionPanel";
import { Dumbbell } from "lucide-react";

export default function TestSessionPage() {
  const { workoutTemplate, format } = useWorkoutContext();
  const { state, dispatch } = use1rmTestReducer();

  const exercises = workoutTemplate?.exercises ?? [];

  return (
    <Page
      title="1RM Test"
      subtitle={
        workoutTemplate
          ? `${workoutTemplate.name} — ${state.phase === "COMPLETED" ? "Complete" : "In Progress"}`
          : undefined
      }
      icon={Dumbbell}
    >
      {state.phase === "SETUP" && (
        <TestSetupPanel state={state} dispatch={dispatch} exercises={exercises} />
      )}
      {state.phase === "WARM_UP" && (
        <WarmupPanel state={state} dispatch={dispatch} format={format} />
      )}
      {state.phase === "TESTING" && (
        <AttemptPanel state={state} dispatch={dispatch} format={format} />
      )}
      {state.phase === "COMPLETED" && (
        <CompletionPanel
          state={state}
          dispatch={dispatch}
          workoutTemplateId={workoutTemplate?.id ?? ""}
          format={format}
        />
      )}
    </Page>
  );
}
