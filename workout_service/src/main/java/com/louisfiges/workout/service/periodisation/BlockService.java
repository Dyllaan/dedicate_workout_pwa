package com.louisfiges.workout.service.periodisation;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dto.request.UpdateDateRequest;
import com.louisfiges.workout.dto.responses.BlockDTO;
import com.louisfiges.workout.periodisation.PeriodisationValidationMessages;
import com.louisfiges.workout.repository.BlockRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import com.louisfiges.workout.service.mapper.BlockMapper;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
@Transactional
public class BlockService {

    private final BlockRepository blockRepository;
    private final AnalysisCacheEvictor analysisCacheEvictor;
    private final BlockMapper blockMapper;

    public BlockService(
            BlockRepository blockRepository,
            AnalysisCacheEvictor analysisCacheEvictor,
            BlockMapper blockMapper
    ) {
        this.blockRepository = blockRepository;
        this.analysisCacheEvictor = analysisCacheEvictor;
        this.blockMapper = blockMapper;
    }

    public BlockDTO getById(UUID blockId, UUID userId) {
        Block block = findBlock(blockId, userId);
        return blockMapper.toDTO(block);
    }

    public BlockDTO setStartDate(UUID blockId, String startDate, UUID userId) {
        Block block = findBlock(blockId, userId);
        assertProgrammeMutable(block);
        try {
            block.setStartDate(Instant.parse(startDate));
            Block savedBlock = blockRepository.save(block);
            BlockDTO response = blockMapper.toDTO(savedBlock);
            analysisCacheEvictor.evictAnalysisCachesAfterCommit();
            return response;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format");
        }
    }

    public BlockDTO update(UUID blockId, UpdateDateRequest request, UUID userId) {
        Block block = findBlock(blockId, userId);
        assertProgrammeMutable(block);
        block.setName(request.name());
        block.setBlockType(request.blockType());
        block.setProgressionStrategy(request.progressionStrategy());
        block.setDurationWeeks(request.durationWeeks());
        block.setTargetRpeMin(request.targetRpeMin());
        block.setTargetRpeMax(request.targetRpeMax());
        block.setRepRangeMin(request.repRangeMin());
        block.setRepRangeMax(request.repRangeMax());
        block.setBlockOrder(request.blockOrder());
        block.setStartDate(request.startDate());
        Block savedBlock = blockRepository.save(block);
        BlockDTO response = blockMapper.toDTO(savedBlock);
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public void delete(UUID blockId, UUID userId) {
        Block block = findBlock(blockId, userId);
        assertProgrammeMutable(block);
        blockRepository.delete(block);
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
    }

    private Block findBlock(UUID blockId, UUID userId) {
        return blockRepository.findByIdAndUserId(blockId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Block not found"));
    }

    private void assertProgrammeMutable(Block block) {
        if (block.getProgramme() != null && block.getProgramme().isArchived()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    PeriodisationValidationMessages.ARCHIVED_PROGRAMME_IMMUTABLE
            );
        }
    }
}
