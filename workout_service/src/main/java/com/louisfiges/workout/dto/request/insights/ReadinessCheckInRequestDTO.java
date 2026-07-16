package com.louisfiges.workout.dto.request.insights;

public record ReadinessCheckInRequestDTO(
        short sleepQuality,
        short stressLevel,
        short sorenessLevel,
        short confidenceLevel
) {
}

