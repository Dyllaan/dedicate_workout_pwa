package com.louisfiges.workout.dto.request;

import java.time.LocalDate;

public record ExerciseHistoryRequest (
        Integer limit,
        LocalDate fromDate,
        LocalDate toDate
) {
}
