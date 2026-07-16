package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.periodisation.PresetType;

import java.util.List;
import java.util.UUID;

public record CreateFromPresetRequest(
        UUID splitId,
        PresetType presetType,
        String startDate,
        String meetDate,
        List<WorkoutFrequencyRequest> workoutFrequencies
) {
}
