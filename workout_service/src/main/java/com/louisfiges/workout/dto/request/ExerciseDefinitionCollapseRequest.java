package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;
import java.util.UUID;

public record ExerciseDefinitionCollapseRequest(
        List<UUID> sourceDefinitionIds
) implements DTO {
}
