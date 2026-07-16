package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

public record WorkoutUserSettingsDTO(
        int defaultRestSeconds
) implements DTO {
}
