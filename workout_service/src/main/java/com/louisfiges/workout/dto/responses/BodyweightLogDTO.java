package com.louisfiges.workout.dto.responses;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BodyweightLogDTO(
        UUID id,
        BigDecimal weightKg,
        LocalDate loggedAt,
        String notes
) {}
