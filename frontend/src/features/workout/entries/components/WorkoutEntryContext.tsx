import { createContext } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { workoutApi } from '@/api/api';
import type { WorkoutEntry, UpdateWorkoutEntryRequest } from '@/features/workout/types/Workout';
import { useWorkoutEntryMutations } from '@/features/workout/entries/hooks/useWorkoutEntries';

interface WorkoutEntryContextType {
  workoutEntry: WorkoutEntry | null;
  isLoading: boolean;
  error: Error | null;
  updateWorkoutEntry: (params: { id: string; updates: UpdateWorkoutEntryRequest }) => Promise<WorkoutEntry>;
}

const WorkoutEntryContext = createContext<WorkoutEntryContextType | undefined>(undefined);

export function WorkoutEntryProvider({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { updateWorkoutEntry } = useWorkoutEntryMutations();

  const { data: workoutEntry = null, isLoading, error } = useQuery({
    queryKey: ['workout-entry', id],
    queryFn: async () => {
      if (!id) throw new Error('No workout entry ID provided');
      const { data } = await workoutApi.get<WorkoutEntry>(`/workout-entries/${id}`);
      return data;
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  return (
    <WorkoutEntryContext.Provider
      value={{
        workoutEntry,
        isLoading,
        error: error as Error | null,
        updateWorkoutEntry,
      }}
    >
      {children}
    </WorkoutEntryContext.Provider>
  );
}

export default WorkoutEntryContext;
