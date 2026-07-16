package com.louisfiges.workout.dto.responses.insights;

import java.time.Instant;

public record ReadinessHistoryPointDTO(
        Instant createdAt,
        short readinessScore,
        short sleepQuality,
        short stressLevel,
        short sorenessLevel,
        short confidenceLevel
) {
}

