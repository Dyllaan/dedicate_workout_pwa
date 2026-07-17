import { formatRestTime } from "@/features/workout/entries/utils/restTime";
import type { SetEntry } from "@/features/workout/types/Workout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type ExerciseSetsTableProps = {
    sets: SetEntry[];
    format: (value: number) => string;
};

function getNumberOfIdenticalSets(sets: SetEntry[], targetSet: SetEntry) {
    return sets.filter(
        (set) => set.reps === targetSet.reps && set.weight === targetSet.weight,
    ).length;
}

export default function ExerciseSetsTable({ sets, format }: ExerciseSetsTableProps) {
    const uniqueSets = sets.reduce(
        (acc: SetEntry[], currentSet: SetEntry) => {
            const found = acc.find(
                (set) => set.reps === currentSet.reps && set.weight === currentSet.weight,
            );
            if (!found) {
                acc.push(currentSet);
            }
            return acc;
        },
        [],
    );

    return (
        <div className="px-2 pb-2 text-muted-foreground">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Sets</TableHead>
                        <TableHead>Reps</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead className="text-center">Rest</TableHead>
                        <TableHead className="text-right">RPE</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {uniqueSets.map((set: SetEntry, index: number) => {
                        const count = getNumberOfIdenticalSets(sets, set);
                        return (
                            <TableRow key={index} className="hover:bg-transparent">
                                <TableCell>
                                    {index + 1}
                                </TableCell>
                                <TableCell>
                                    {count}x
                                </TableCell>
                                <TableCell>{set.reps}</TableCell>
                                <TableCell>
                                    {set.weight ? format(set.weight) : "BW"}
                                </TableCell>
                                <TableCell className="text-center">
                                    {set.restBeforeSeconds != null
                                        ? formatRestTime(set.restBeforeSeconds)
                                        : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                    {set.rpe != null ? set.rpe : "—"}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}