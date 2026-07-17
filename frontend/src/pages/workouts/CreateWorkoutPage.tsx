import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { WorkoutEditorContainer as WorkoutEditor } from "@/features/workout/templates/components/WorkoutEditorContainer";
import useWorkoutEditorForm, {
  createEmptyWorkoutEditorValues,
  editorValuesToCreateWorkoutPayload,
  type WorkoutEditorValues,
} from "@/features/workout/templates/hooks/useWorkoutEditorForm";
import useWorkoutTemplates from "@/features/workout/templates/hooks/useWorkoutTemplates";
import { ICONS } from "@/config/iconConfig";

export default function CreateWorkoutPage() {
  const navigate = useNavigate();
  const { createWorkout } = useWorkoutTemplates({ enabled: false });

  const editor = useWorkoutEditorForm({
    defaultValues: createEmptyWorkoutEditorValues(),
    resetKey: "create-workout",
    onSubmit: async (values: WorkoutEditorValues) => {
      try {
        const newWorkout = await createWorkout(
          editorValuesToCreateWorkoutPayload(values),
        );
        navigate(`/workout/${newWorkout.id}`);
        enqueueSnackbar("Workout created successfully!", { variant: "success" });
      } catch {
        enqueueSnackbar("Failed to create workout. Please try again.", {
          variant: "error",
        });
      }
    },
  });

  return (
    <WorkoutEditor
      editor={editor}
      icon={ICONS.workout}
      title="Create Workout"
      subtitle="Build your custom workout routine"
      saveLabel="Create Workout"
      undoLabel="Reset"
    />
  );
}
