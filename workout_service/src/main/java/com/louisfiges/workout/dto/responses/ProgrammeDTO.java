package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;
import com.louisfiges.workout.periodisation.ProgrammePresetType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ProgrammeDTO(
        UUID id,
        LocalDateTime createdAt,
        List<BlockDTO> blocks,
        LocalDateTime startDate,
        boolean active,
        ProgrammePresetType presetType,
        boolean archived
) implements DTO {
}
