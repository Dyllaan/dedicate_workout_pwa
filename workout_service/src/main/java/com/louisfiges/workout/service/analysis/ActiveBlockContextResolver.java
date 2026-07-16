package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.types.BlockContext;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryBlockContextDTO;
import com.louisfiges.workout.repository.SplitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ActiveBlockContextResolver {

    private final SplitRepository splitRepository;

    public ActiveBlockContextResolver(SplitRepository splitRepository) {
        this.splitRepository = splitRepository;
    }

    public ResolvedActiveBlockContext resolve(UUID userId) {
        Split split = splitRepository.findActiveByUserIdWithWorkouts(userId).orElse(null);
        if (split == null) {
            return ResolvedActiveBlockContext.empty();
        }

        Programme programme = resolveActiveProgramme(split);
        if (programme == null) {
            return ResolvedActiveBlockContext.empty();
        }

        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        return resolve(programme, now);
    }

    public ResolvedActiveBlockContext resolve(Programme programme, Instant now) {
        Block block = resolveCurrentBlock(programme, now);
        if (block == null) {
            return ResolvedActiveBlockContext.empty();
        }

        return toResolvedBlockContext(block, now);
    }

    Block resolveCurrentBlock(Programme programme, Instant now) {
        if (programme == null || programme.getBlocks() == null || programme.getBlocks().isEmpty()) {
            return null;
        }

        List<Block> blocks = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        return blocks.stream()
                .filter(candidate -> isCurrentBlock(candidate, now))
                .findFirst()
                .orElse(blocks.get(0));
    }

    private Programme resolveActiveProgramme(Split split) {
        if (split.getProgrammes() == null || split.getProgrammes().isEmpty()) {
            return null;
        }

        return split.getProgrammes().stream()
                .filter(Programme::isActive)
                .findFirst()
                .orElse(split.getProgrammes().get(0));
    }

    private boolean isCurrentBlock(Block block, Instant now) {
        if (block == null || block.getStartDate() == null) {
            return false;
        }

        Instant blockEnd = block.getStartDate().plus(block.getDurationWeeks() * 7L, ChronoUnit.DAYS);
        return !now.isBefore(block.getStartDate()) && now.isBefore(blockEnd);
    }

    private int resolveCurrentWeek(Block block, Instant now) {
        if (block == null || block.getStartDate() == null) {
            return 1;
        }

        long daysBetween = ChronoUnit.DAYS.between(block.getStartDate(), now);
        int computedWeek = (int) Math.floor(daysBetween / 7.0) + 1;
        return Math.max(1, Math.min(computedWeek, block.getDurationWeeks()));
    }

    private ResolvedActiveBlockContext toResolvedBlockContext(Block block, Instant now) {
        int currentWeek = resolveCurrentWeek(block, now);
        Week currentWeekEntity = block.getWeeks().stream()
                .filter(week -> week.getWeekNumber() == currentWeek)
                .findFirst()
                .orElse(null);

        boolean deload = currentWeekEntity != null && currentWeekEntity.isDeload();
        double targetRpeMin = currentWeekEntity != null && currentWeekEntity.getRpeOverrideMin() != null
                ? currentWeekEntity.getRpeOverrideMin()
                : block.getTargetRpeMin();
        double targetRpeMax = currentWeekEntity != null && currentWeekEntity.getRpeOverrideMax() != null
                ? currentWeekEntity.getRpeOverrideMax()
                : block.getTargetRpeMax();
        int targetSetsThisWeek = currentWeekEntity != null ? currentWeekEntity.getTargetSetsPerExercise() : 0;

        BlockContext blockContext = new BlockContext(
                block.getBlockType(),
                block.getProgressionStrategy(),
                currentWeek,
                block.getDurationWeeks(),
                deload,
                targetRpeMin,
                targetRpeMax,
                block.getRepRangeMin(),
                block.getRepRangeMax(),
                targetSetsThisWeek
        );

        ExerciseHistoryBlockContextDTO dto = new ExerciseHistoryBlockContextDTO(
                block.getId(),
                block.getName(),
                block.getBlockType(),
                block.getProgressionStrategy(),
                currentWeek,
                block.getDurationWeeks(),
                deload,
                targetRpeMin,
                targetRpeMax,
                block.getRepRangeMin(),
                block.getRepRangeMax()
        );

        return new ResolvedActiveBlockContext(blockContext, dto);
    }

    record ResolvedActiveBlockContext(BlockContext blockContext, ExerciseHistoryBlockContextDTO dto) {
        static ResolvedActiveBlockContext empty() {
            return new ResolvedActiveBlockContext(null, null);
        }
    }
}
