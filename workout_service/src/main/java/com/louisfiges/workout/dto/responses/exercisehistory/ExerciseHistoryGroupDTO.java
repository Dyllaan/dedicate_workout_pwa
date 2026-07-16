package com.louisfiges.workout.dto.responses.exercisehistory;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.time.LocalDate;
import java.util.List;

public record ExerciseHistoryGroupDTO(
        LocalDate date,
        int groupOrder,
        List<ExerciseHistorySessionDTO> sessions
) implements DTO {
}
