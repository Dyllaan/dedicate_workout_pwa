
type SetEntryWithDate = {
    id: string,
    reps: number,
    weight: number,
    rpe: number,
    notes: string,
    restBeforeSeconds?: number | null,
    workoutDate: string
};

export type { SetEntryWithDate };
