package com.louisfiges.workout.dto.responses.insights;

import java.time.Instant;
import java.util.UUID;

public record ReadinessCheckInDTO(
        UUID id,
        short sleepQuality,
        short stressLevel,
        short sorenessLevel,
        short confidenceLevel,
        short readinessScore,
        Instant createdAt
) {
}

