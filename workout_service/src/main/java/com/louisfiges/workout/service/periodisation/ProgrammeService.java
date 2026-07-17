package com.louisfiges.workout.service.periodisation;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dto.request.CreateBlockRequest;
import com.louisfiges.workout.dto.request.CreateProgrammeRequest;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.ProgrammeDTO;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.periodisation.PeriodisationValidationMessages;
import com.louisfiges.workout.periodisation.PresetType;
import com.louisfiges.workout.periodisation.ProgrammePresetType;
import com.louisfiges.workout.repository.BlockRepository;
import com.louisfiges.workout.repository.ProgrammeRepository;
import com.louisfiges.workout.util.GenerateWeeks;
import com.louisfiges.workout.util.PaginationUtils;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class ProgrammeService {

    private final SplitService splitService;
    private final ProgrammeRepository programmeRepository;
    private final BlockRepository blockRepository;
    private final AnalysisCacheEvictor analysisCacheEvictor;

    public ProgrammeService(
            SplitService splitService,
            ProgrammeRepository programmeRepository,
            BlockRepository blockRepository,
            AnalysisCacheEvictor analysisCacheEvictor
    ) {
        this.splitService = splitService;
        this.programmeRepository = programmeRepository;
        this.blockRepository = blockRepository;
        this.analysisCacheEvictor = analysisCacheEvictor;
    }

    public ProgrammeDTO createProgramme(CreateProgrammeRequest request, UUID userId) {
        return createProgramme(request, userId, ProgrammePresetType.CUSTOM);
    }

    public ProgrammeDTO createProgramme(
            CreateProgrammeRequest request,
            UUID userId,
            ProgrammePresetType presetType
    ) {
        Split split = splitService.findByIdAndUserId(request.splitId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Split not found"));

        Programme programme = new Programme();
        programme.setSplit(split);
        programme.setActive(true);
        programme.setStartDate(request.startDate().atStartOfDay(ZoneOffset.UTC).toInstant());
        programme.setPresetType(presetType == null ? ProgrammePresetType.CUSTOM : presetType);

        programmeRepository.deactivateAllBySplitId(split.getId());
        Programme saved = programmeRepository.save(programme);

        for (CreateBlockRequest blockRequest : request.blocks()) {
            createAndSaveBlock(saved, blockRequest);
        }

        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return saved.toDTO();
    }

    public ProgrammeDTO setProgrammeActive(UUID programmeId, boolean active, UUID userId) {
        Programme programme = findOwnedProgramme(programmeId, userId);
        if (active) {
            programmeRepository.deactivateAllBySplitId(programme.getSplit().getId());
        }
        programme.setActive(active);
        ProgrammeDTO response = programmeRepository.save(programme).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public ProgrammeDTO addBlockToProgramme(UUID programmeId, CreateBlockRequest request, UUID userId) {
        Programme programme = findOwnedProgramme(programmeId, userId);
        createAndSaveBlock(programme, request);
        ProgrammeDTO response = programmeRepository.findById(programmeId)
                .orElseThrow(() -> new ResourceNotFoundException("Programme not found"))
                .toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public ProgrammeDTO setProgrammeStartDate(UUID programmeId, Instant startDate, UUID userId) {
        Programme programme = findOwnedProgramme(programmeId, userId);

        List<Block> blocks = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        if (blocks.isEmpty()) {
            throw new BadRequestException("No blocks found for this programme");
        }

        programme.setStartDate(startDate);
        Instant cursor = startDate;
        for (Block block : blocks) {
            block.setStartDate(cursor);
            cursor = cursor.plusSeconds(block.getDurationWeeks() * 7L * 24 * 60 * 60);
        }

        ProgrammeDTO response = programmeRepository.save(programme).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public ProgrammeDTO archiveProgramme(UUID programmeId, UUID userId) {
        Programme programme = findOwnedProgramme(programmeId, userId);
        if (programme.isActive()) {
            throw new BadRequestException("Active programmes cannot be archived");
        }
        programme.setArchived(true);
        ProgrammeDTO response = programmeRepository.save(programme).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public void deleteProgramme(UUID programmeId, UUID userId) {
        programmeRepository.delete(findOwnedProgramme(programmeId, userId));
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
    }

    public List<PresetType> getAllPresets() {
        return List.of(PresetType.values());
    }

    public List<ProgrammeDTO> getAllByUserForSplit(UUID userId, UUID splitId) {
        return programmeRepository.findByUserIdAndSplitId(userId, splitId)
                .stream()
                .map(Programme::toDTO)
                .toList();
    }

    public PagedResponse<ProgrammeDTO> getAllByUserForSplit(UUID userId, UUID splitId, int page, int size) {
        return PagedResponse.from(
                programmeRepository.findPageByUserIdAndSplitId(userId, splitId, PaginationUtils.toPageable(page, size))
                        .map(Programme::toDTO)
        );
    }

    public Optional<Programme> findByIdAndUserId(UUID programmeId, UUID userId) {
        return programmeRepository.findByIdAndUserId(programmeId, userId);
    }

    private Programme findOwnedProgramme(UUID programmeId, UUID userId) {
        Programme programme = programmeRepository.findByIdAndUserId(programmeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Programme not found"));
        if (programme.isArchived()) {
            throw new BadRequestException(PeriodisationValidationMessages.ARCHIVED_PROGRAMME_IMMUTABLE);
        }
        return programme;
    }

    private void createAndSaveBlock(Programme programme, CreateBlockRequest request) {
        Block block = new Block(
                programme,
                request.name(),
                request.blockType(),
                request.progressionStrategy(),
                request.durationWeeks(),
                request.targetRpeMin(),
                request.targetRpeMax(),
                request.repRangeMin(),
                request.repRangeMax(),
                request.blockOrder(),
                request.startDate()
        );
        block.setWeeks(GenerateWeeks.generateWeeks(block, request.durationWeeks()));
        blockRepository.save(block);
    }
}
