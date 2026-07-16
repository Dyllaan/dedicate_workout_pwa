import { useContext } from 'react';
import WorkoutEntryContext from './WorkoutEntryContext';

export default function useWorkoutEntryContext() {
  const context = useContext(WorkoutEntryContext);
  if (!context) {
    throw new Error('useWorkoutEntryContext must be used within WorkoutEntryProvider');
  }
  return context;
}