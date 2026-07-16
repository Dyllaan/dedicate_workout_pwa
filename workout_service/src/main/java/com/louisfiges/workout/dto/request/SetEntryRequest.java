package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.analysis.SetRole;

public record SetEntryRequest(
        int reps,
        Double weight,
        Double rpe,
        String notes,
        SetRole setRole,
        Integer restBeforeSeconds
) {
    public SetEntryRequest(int reps, Double weight, Double rpe, String notes) {
        this(reps, weight, rpe, notes, null);
    }

    public SetEntryRequest(int reps, Double weight, Double rpe, String notes, SetRole setRole) {
        this(reps, weight, rpe, notes, setRole, null);
    }
}
