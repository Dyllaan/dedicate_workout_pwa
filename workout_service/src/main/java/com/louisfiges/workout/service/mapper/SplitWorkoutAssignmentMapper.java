package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.periodisation.SplitWorkoutAssignment;
import com.louisfiges.workout.dto.responses.SplitWorkoutAssignmentDTO;
import org.springframework.stereotype.Component;

@Component
public class SplitWorkoutAssignmentMapper {

    public SplitWorkoutAssignmentDTO toDTO(SplitWorkoutAssignment entity) {
        return new SplitWorkoutAssignmentDTO(
                entity.getId(),
                entity.getWorkoutTemplate().getId(),
                entity.getSessionsPerWeek(),
                entity.getWorkoutOrder()
        );
    }
}
