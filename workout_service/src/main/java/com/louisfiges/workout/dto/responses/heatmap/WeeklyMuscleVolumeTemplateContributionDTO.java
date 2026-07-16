package com.louisfiges.workout.dto.responses.heatmap;

import java.util.List;
import java.util.UUID;

public record WeeklyMuscleVolumeTemplateContributionDTO(
        UUID templateId,
        String templateName,
        double targetSets,
        double completedSets,
        List<WeeklyMuscleVolumeLiftContributionDTO> liftContributions
) {
}
