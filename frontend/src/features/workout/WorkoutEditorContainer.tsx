import type { LucideIcon } from "lucide-react";
import type { WorkoutEditorController } from "@/hooks/forms/useWorkoutEditorForm";
import { useWorkoutEditor } from "./hooks/useWorkoutEditor";
import { WorkoutEditorView } from "./WorkoutEditorView";

interface WorkoutEditorContainerProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  subtitleIcon?: LucideIcon;
  saveLabel?: string;
  undoLabel?: string;
  editor: WorkoutEditorController;
}

export function WorkoutEditorContainer(props: WorkoutEditorContainerProps) {
  const workoutEditor = useWorkoutEditor({
    editor: props.editor,
    saveLabel: props.saveLabel,
    undoLabel: props.undoLabel,
  });
  return (
    <WorkoutEditorView
      title={props.title}
      subtitle={props.subtitle}
      icon={props.icon}
      subtitleIcon={props.subtitleIcon}
      {...workoutEditor}
    />
  );
}
