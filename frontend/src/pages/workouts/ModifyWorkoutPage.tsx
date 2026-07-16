import { useNavigate } from "react-router-dom";
import { Dumbbell, SquarePen } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { WorkoutEditorContainer as WorkoutEditor } from "@/features/workout/WorkoutEditorContainer";
import Page from "@/components/layout/section/Page";
import Section from "@/components/layout/Section";
import LoadingState from "@/components/layout/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import useWorkoutEditorForm, {
  editorValuesToUpdateWorkoutPayload,
  workoutTemplateToEditorValues,
  type WorkoutEditorValues,
} from "@/hooks/forms/useWorkoutEditorForm";
import useWorkoutContext from "@/hooks/forms/context/useWorkoutContext";
import { useWorkoutTemplateMutations } from "@/hooks/workout/useWorkoutTemplates";
import type { WorkoutTemplate } from "@/types/Workout";
import ErrorState from "@/components/layout/feedback/ErrorState";

export default function ModifyWorkoutPage() {
  const { workoutTemplate: workout, isLoading } = useWorkoutContext();
  const navigate = useNavigate();

  if (isLoading) {
    return <ModifyWorkoutPageLoading />;
  }

  if (!workout) {
    return (
      <Page
        title="Workout not found"
        icon={Dumbbell}
        subtitle="This workout may have been deleted or never existed."
      >
        <ErrorState
          title="We couldn't find this workout."
          description="Go back to your workouts list and choose another template."
          action={<Button icon={undefined} onClick={() => navigate("/workouts")}>Back to workouts</Button>}
        />
      </Page>
    );
  }

  return <LoadedModifyWorkoutPage workout={workout} />;
}

function ModifyWorkoutPageLoading() {
  return (
    <Page
      title="Modify Workout"
      subtitle="Preparing your workout so you can make edits."
      icon={Dumbbell}
    >
      <Section title="Workout details" subtitle="Loading editor controls">
        <LoadingState rows={2} />
      </Section>
      <Section title="Exercises" subtitle="Loading exercise list">
        <LoadingState rows={4} />
      </Section>
    </Page>
  );
}

function LoadedModifyWorkoutPage({ workout }: { workout: WorkoutTemplate }) {
  const navigate = useNavigate();
  const { updateWorkout } = useWorkoutTemplateMutations();

  const resetKey = JSON.stringify({
    id: workout.id,
    name: workout.name,
    category: workout.category,
    exercises: workout.exercises,
  });

  const editor = useWorkoutEditorForm({
    defaultValues: workoutTemplateToEditorValues(workout),
    resetKey,
    onSubmit: async (values: WorkoutEditorValues) => {
      try {
        await updateWorkout({
          id: workout.id,
          updates: editorValuesToUpdateWorkoutPayload(values),
        });
        enqueueSnackbar("Workout updated successfully!", {
          variant: "success",
        });
        navigate(`/workout/${workout.id}`);
      } catch {
        enqueueSnackbar("Failed to update workout. Please try again.", {
          variant: "error",
        });
      }
    },
  });

  return (
    <WorkoutEditor
      editor={editor}
      title="Modify Workout"
      subtitle="Edit your workout routine"
      icon={Dumbbell}
      subtitleIcon={SquarePen}
      saveLabel="Save"
      undoLabel="Restore"
    />
  );
}
