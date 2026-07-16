package com.louisfiges.workout.dto.responses.heatmap;

import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.heatmap.MuscleGroupId;

import java.util.List;
import java.util.UUID;

public record ResolvedExerciseHeatmapDTO(
        UUID mappingId,
        String exerciseName,
        String variant,
        MappingSource mappingSource,
        Long exerciseInfoId,
        String resolvedExerciseName,
        MuscleGroupId primaryMuscle,
        List<MuscleGroupId> secondaryMuscles,
        List<MuscleGroupId> synergistMuscles
) {
}
