package com.louisfiges.workout.dto.request;

public record UpdateWeekRequest(
        Integer targetSetsPerExercise,
        Double rpeOverrideMin,
        Double rpeOverrideMax,
        Boolean isDeload
) {}
