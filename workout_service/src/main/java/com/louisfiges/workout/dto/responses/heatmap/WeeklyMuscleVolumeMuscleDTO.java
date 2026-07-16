package com.louisfiges.workout.dto.responses.heatmap;

import java.util.List;

public record WeeklyMuscleVolumeMuscleDTO(
        String muscleId,
        double targetSets,
        double completedSets,
        double completionRatio,
        List<WeeklyMuscleVolumeTemplateContributionDTO> templateContributions,
        MuscleVolumeTrackingStatusDTO trackingStatus
) {}