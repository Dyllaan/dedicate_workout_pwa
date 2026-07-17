package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dto.responses.BlockDTO;
import com.louisfiges.workout.dto.responses.ProgrammeDTO;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Component
public class ProgrammeMapper {

    private final BlockMapper blockMapper;

    public ProgrammeMapper(BlockMapper blockMapper) {
        this.blockMapper = blockMapper;
    }

    public ProgrammeDTO toDTO(Programme entity) {
        List<BlockDTO> blockDTOs = entity.getBlocks().stream()
                .map(blockMapper::toDTO)
                .toList();

        LocalDateTime createdDateTime = entity.getCreatedAt() != null
                ? LocalDateTime.ofInstant(entity.getCreatedAt(), ZoneId.systemDefault())
                : LocalDateTime.now();

        LocalDateTime startDateTime = entity.getStartDate() != null
                ? LocalDateTime.ofInstant(entity.getStartDate(), ZoneId.systemDefault())
                : LocalDateTime.now();

        return new ProgrammeDTO(
                entity.getId(),
                createdDateTime,
                blockDTOs,
                startDateTime,
                entity.isActive(),
                entity.getPresetType(),
                entity.isArchived()
        );
    }
}
