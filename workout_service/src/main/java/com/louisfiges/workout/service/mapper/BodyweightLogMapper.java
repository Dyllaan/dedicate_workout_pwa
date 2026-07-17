package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.core.BodyweightLog;
import com.louisfiges.workout.dto.responses.BodyweightLogDTO;
import org.springframework.stereotype.Component;

@Component
public class BodyweightLogMapper {

    public BodyweightLogDTO toDTO(BodyweightLog entity) {
        return new BodyweightLogDTO(entity.getId(), entity.getWeightKg(), entity.getLoggedAt(), entity.getNotes());
    }
}
