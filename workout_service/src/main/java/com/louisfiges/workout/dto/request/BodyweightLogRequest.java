package com.louisfiges.workout.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BodyweightLogRequest(
        BigDecimal weightKg,
        LocalDate loggedAt,
        String notes
) {}
