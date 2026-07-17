import { useOutletContext } from "react-router-dom";
import type { WorkoutTemplate, WorkoutEntry } from "@/features/workout/types/Workout";
import type { WorkoutStartupSummary } from "@/features/startup/types/Startup";
type WorkoutContext = {
    workoutTemplate: WorkoutTemplate | null;
    lastEntry: WorkoutEntry | null;
    entries: WorkoutEntry[];
    stats: WorkoutStartupSummary | null;
    isLoading: boolean;
    format: (kg: number) => string;
};

export default function useWorkoutContext() {
    return useOutletContext<WorkoutContext>();
}
