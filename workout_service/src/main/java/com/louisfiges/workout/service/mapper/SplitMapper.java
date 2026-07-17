package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dao.periodisation.SplitWorkoutAssignment;
import com.louisfiges.workout.dto.responses.SplitDTO;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
public class SplitMapper {

    private final ProgrammeMapper programmeMapper;
    private final SplitWorkoutAssignmentMapper splitWorkoutAssignmentMapper;

    public SplitMapper(ProgrammeMapper programmeMapper, SplitWorkoutAssignmentMapper splitWorkoutAssignmentMapper) {
        this.programmeMapper = programmeMapper;
        this.splitWorkoutAssignmentMapper = splitWorkoutAssignmentMapper;
    }

    public SplitDTO toDTO(Split entity) {
        LocalDateTime createdDateTime = entity.getCreatedAt() != null
                ? LocalDateTime.ofInstant(entity.getCreatedAt(), ZoneId.systemDefault())
                : LocalDateTime.now();

        return new SplitDTO(
                entity.getId(),
                entity.getName(),
                createdDateTime,
                entity.isActive(),
                entity.getProgrammes().stream().map(programmeMapper::toDTO).toList(),
                entity.getAssignments().stream().map(splitWorkoutAssignmentMapper::toDTO).toList()
        );
    }
}
