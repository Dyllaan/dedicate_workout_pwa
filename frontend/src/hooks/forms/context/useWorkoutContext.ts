import { useOutletContext } from "react-router-dom";
import type { WorkoutTemplate, WorkoutEntry } from "@/types/Workout";
import type { WorkoutStartupSummary } from "@/types/Startup";
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
