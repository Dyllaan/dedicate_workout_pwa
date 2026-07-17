import type {ExerciseConfig, WorkoutTemplate} from "@/features/workout/types/Workout";
import Panel from "@/components/layout/frames/Panel";
import { useState } from "react";
import {Dumbbell, Save} from "lucide-react";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import {formatExerciseLabel} from "@/features/insights/utils/insightsUtils.ts";
import buildExerciseHistoryHref from "@/features/workout/utils/buildExerciseHistoryHref";
import {Button, Input} from "@/components/ui";
import {useWorkoutSettings} from "@/features/workout/hooks/useWorkoutSettings";
import {enqueueSnackbar} from "notistack";
import {useWorkoutTemplateMutations} from "@/features/workout/templates/hooks/useWorkoutTemplates";

type ConfigureProps = {
    workoutTemplate: WorkoutTemplate;
};

export default function ConfigurePanel({
                                         workoutTemplate,
                                     }: ConfigureProps) {
    const [restDrafts, setRestDrafts] = useState<Record<number, string>>({});
    const { settings } = useWorkoutSettings();
    const { updateExerciseTargetRestSeconds,  } = useWorkoutTemplateMutations();


    const saveExerciseRestTarget = async (exerciseConfigId: string, index: number) => {
        const raw = restDrafts[index];
        const parsed = raw === "" || raw == null ? null : Math.max(0, Math.min(7200, Math.round(parseInt(raw) || 0)));

        try {
            await updateExerciseTargetRestSeconds({
                workoutId: workoutTemplate.id,
                exerciseConfigId: exerciseConfigId,
                targetRestSeconds: parsed,
            });
            enqueueSnackbar("Rest target updated.", { variant: "success" });
        } catch {
            enqueueSnackbar("Failed to update rest target.", { variant: "error" });
        }
    };

    return (
        <Panel>
            {workoutTemplate.exercises.map((exercise: ExerciseConfig, index: number) => {
                const exerciseName = exercise.exerciseDefinition.exerciseName?.trim();
                const exerciseLabel = formatExerciseLabel(exerciseName, exercise.exerciseDefinition.variant);
                const historyHref = exerciseName
                    ? buildExerciseHistoryHref(
                        exerciseName,
                        exercise.exerciseDefinition.variant,
                        workoutTemplate.id,
                    )
                    : null;

                return (
                    <DashCardRow
                        label={exerciseLabel}
                        description={`
                ${exercise.goalSets} sets` +
                            (exercise.targetRestSeconds ? ` and ${exercise.targetRestSeconds}s rest target` : "") +
                            (exercise.exerciseDefinition.variant ? ` (${exercise.exerciseDefinition.variant})` : "")
                        }
                        icon={Dumbbell}
                        key={index}
                        to={historyHref ?? undefined}
                        actionLabel="See History"
                    >
                        <div className="flex items-center gap-2">
                            <span className="ui-text-kicker max-w-16">Rest target</span>
                            <Input
                                type="number"
                                min={0}
                                max={7200}
                                inputMode="numeric"
                                value={restDrafts[index] ?? exercise.targetRestSeconds ?? ""}
                                placeholder={`${settings.defaultRestSeconds}s default`}
                                onChange={(event) =>
                                    setRestDrafts((previous) => ({
                                        ...previous,
                                        [index]: event.target.value,
                                    }))
                                }
                                className="flex-1"
                            />
                            <Button
                                icon={Save}
                                onClick={() => exercise.exerciseConfigId && void saveExerciseRestTarget(exercise.exerciseConfigId, index)}
                                disabled={!exercise.exerciseConfigId || restDrafts[index] === undefined || restDrafts[index] === (exercise.targetRestSeconds ?? "").toString()}
                            />
                        </div>
                    </DashCardRow>
                );
            })}
        </Panel>
    );
}
