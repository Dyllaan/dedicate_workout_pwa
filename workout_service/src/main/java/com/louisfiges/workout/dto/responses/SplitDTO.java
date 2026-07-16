package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SplitDTO(
        UUID id,
        String name,
        LocalDateTime createdAt,
        boolean active,
        List<ProgrammeDTO> programmes,
        List<SplitWorkoutAssignmentDTO> workoutAssignments
) implements DTO {}
