package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.UUID;

public record ProgrammeFocusRequest(
        UUID focusExerciseConfigId
) implements DTO {
}
