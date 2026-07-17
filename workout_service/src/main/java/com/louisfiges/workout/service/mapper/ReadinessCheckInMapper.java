package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.ReadinessCheckIn;
import com.louisfiges.workout.dto.responses.insights.ReadinessCheckInDTO;
import org.springframework.stereotype.Component;

@Component
public class ReadinessCheckInMapper {

    public ReadinessCheckInDTO toDTO(ReadinessCheckIn entity) {
        return new ReadinessCheckInDTO(
                entity.getId(),
                entity.getSleepQuality(),
                entity.getStressLevel(),
                entity.getSorenessLevel(),
                entity.getConfidenceLevel(),
                calculateScore(entity),
                entity.getCreatedAt()
        );
    }

    private static short calculateScore(ReadinessCheckIn checkIn) {
        int score = checkIn.getSleepQuality() + (6 - checkIn.getStressLevel()) + (6 - checkIn.getSorenessLevel()) + checkIn.getConfidenceLevel();
        return (short) Math.max(4, Math.min(score, 20));
    }
}
