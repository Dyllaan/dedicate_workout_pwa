package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.StrengthCalculator;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.StrengthEstimate;
import com.louisfiges.workout.repository.BlockRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class BlockAwareOneRmService {

    private final WorkoutEntryRepository workoutEntryRepository;
    private final StrengthCalculator strengthCalculator;
    private final ActiveBlockContextResolver activeBlockContextResolver;
    private final BlockRepository blockRepository;

    public BlockAwareOneRmService(WorkoutEntryRepository workoutEntryRepository,
                                   StrengthCalculator strengthCalculator,
                                   ActiveBlockContextResolver activeBlockContextResolver,
                                   BlockRepository blockRepository) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.strengthCalculator = strengthCalculator;
        this.activeBlockContextResolver = activeBlockContextResolver;
        this.blockRepository = blockRepository;
    }

    public record OneRmResult(double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate, boolean carryForward) {}
    public record BlockDateRange(Instant start, Instant end) {}

    public Optional<OneRmResult> resolveOneRm(UUID exerciseDefId, UUID userId) {
        ActiveBlockContextResolver.ResolvedActiveBlockContext context = activeBlockContextResolver.resolve(userId);
        if (context.dto() == null) {
            return Optional.empty();
        }

        Block currentBlock = blockRepository.findById(context.dto().blockId()).orElse(null);
        if (currentBlock == null) {
            return Optional.empty();
        }

        BlockDateRange currentRange = resolveEffectiveDateRange(currentBlock);
        if (currentRange != null) {
            OneRmResult result = estimateOneRm(exerciseDefId, userId, currentRange.start(), currentRange.end(), false);
            if (result != null) {
                return Optional.of(result);
            }
        }

        Block previousBlock = findPreviousBlock(currentBlock);
        if (previousBlock != null) {
            BlockDateRange prevRange = resolveEffectiveDateRange(previousBlock);
            if (prevRange != null) {
                OneRmResult result = estimateOneRm(exerciseDefId, userId, prevRange.start(), prevRange.end(), true);
                if (result != null) {
                    return Optional.of(result);
                }
            }
        }

        return Optional.empty();
    }

    public OneRmResult estimateOneRm(UUID exerciseDefId, UUID userId, Instant blockStart, Instant blockEnd, boolean carryForward) {
        List<Object[]> rows = workoutEntryRepository.findBestSetsForExerciseInBlock(
                exerciseDefId, userId, blockStart, blockEnd, PageRequest.of(0, 5)
        );

        if (rows.isEmpty()) return null;

        OneRmResult best = null;
        double bestMedian = 0;

        for (Object[] row : rows) {
            SetEntry set = (SetEntry) row[0];
            Instant setDate = (Instant) row[1];
            if (set.getWeight() == null) continue;

            StrengthEstimate estimate = strengthCalculator.estimateOneRepMax(set.getWeight(), set.getReps());
            double median = median(estimate.epley(), estimate.bryzycki(), estimate.lombardi());

            if (median > bestMedian) {
                bestMedian = median;
                best = new OneRmResult(estimate.epley(), estimate.bryzycki(), estimate.lombardi(), set, setDate, carryForward);
            }
        }

        return best;
    }

    public BlockDateRange resolveEffectiveDateRange(Block block) {
        if (block == null) return null;

        Instant start = block.getStartDate();
        if (start == null) {
            Programme programme = block.getProgramme();
            if (programme == null || programme.getStartDate() == null) return null;
            start = computeBlockStartFromProgramme(programme, block);
            if (start == null) return null;
        }

        Instant end = start.plusSeconds((long) block.getDurationWeeks() * 7 * 24 * 3600);
        return new BlockDateRange(start, end);
    }

    public Block findPreviousBlock(Block current) {
        Programme programme = current.getProgramme();
        if (programme == null) return null;

        List<Block> sorted = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        for (int i = sorted.size() - 1; i >= 0; i--) {
            if (sorted.get(i).getBlockOrder() < current.getBlockOrder()) {
                return sorted.get(i);
            }
        }

        return null;
    }

    private Instant computeBlockStartFromProgramme(Programme programme, Block targetBlock) {
        Instant programmeStart = programme.getStartDate();
        if (programmeStart == null) return null;

        List<Block> sorted = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        long totalDays = 0;
        for (Block b : sorted) {
            if (b.getId().equals(targetBlock.getId())) {
                return programmeStart.plusSeconds(totalDays * 24 * 3600);
            }
            totalDays += (long) b.getDurationWeeks() * 7;
        }

        return null;
    }

    private double median(double a, double b, double c) {
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }
}
