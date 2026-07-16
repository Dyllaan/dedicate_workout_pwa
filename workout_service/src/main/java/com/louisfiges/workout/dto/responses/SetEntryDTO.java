package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;
import com.louisfiges.workout.analysis.SetRole;

import java.util.UUID;

public record SetEntryDTO(
        UUID id,
        int reps,
        Double weight,
        Double rpe,
        String notes,
        SetRole setRole,
        Integer restBeforeSeconds
) implements DTO {
    public SetEntryDTO(UUID id, int reps, Double weight, Double rpe, String notes) {
        this(id, reps, weight, rpe, notes, null);
    }

    public SetEntryDTO(UUID id, int reps, Double weight, Double rpe, String notes, SetRole setRole) {
        this(id, reps, weight, rpe, notes, setRole, null);
    }
}
