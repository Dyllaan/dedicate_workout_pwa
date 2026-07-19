package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutInol;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import com.louisfiges.workout.util.MathUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class InolCalculator {

    private static final Logger log = LoggerFactory.getLogger(InolCalculator.class);

    private final BlockAwareOneRmService oneRmService;
    private final WorkoutInolRepository inolRepository;

    public InolCalculator(BlockAwareOneRmService oneRmService, WorkoutInolRepository inolRepository) {
        this.oneRmService = oneRmService;
        this.inolRepository = inolRepository;
    }

    public int computeAndPersist(WorkoutEntry entry, UUID userId) {
        if (entry.getExercises() == null || entry.getExercises().isEmpty()) {
            return 0;
        }

        int processed = 0;

        for (ExerciseEntry exerciseEntry : entry.getExercises()) {
            if (exerciseEntry.getExerciseDefinition() == null) {
                log.debug("Skipping INOL for exercise without definition: {}", exerciseEntry.getLoggedExerciseName());
                continue;
            }

            Optional<BlockAwareOneRmService.OneRmResult> oneRmOpt =
                    oneRmService.resolveOneRm(exerciseEntry.getExerciseDefinition().getId(), userId);

            if (oneRmOpt.isEmpty()) {
                log.debug("Skipping INOL for {} — no reference 1RM available",
                        exerciseEntry.getLoggedExerciseName());
                continue;
            }

            BlockAwareOneRmService.OneRmResult oneRm = oneRmOpt.get();
            double ref1rm = MathUtils.medianOfThree(oneRm.epley(), oneRm.bryzycki(), oneRm.lombardi());
            double exerciseInol = computeExerciseInol(exerciseEntry, ref1rm);

            String exerciseName = exerciseEntry.getLoggedExerciseName() != null
                    ? exerciseEntry.getLoggedExerciseName()
                    : exerciseEntry.getExerciseDefinition().getExerciseName();

            WorkoutInol inol = new WorkoutInol(
                    userId,
                    entry,
                    exerciseEntry,
                    exerciseName,
                    MathUtils.roundTo2Decimals(exerciseInol),
                    MathUtils.roundTo1Decimal(ref1rm),
                    null,
                    oneRm.carryForward()
            );

            inolRepository.save(inol);
            processed++;
        }

        return processed;
    }

    double computeExerciseInol(ExerciseEntry exerciseEntry, double ref1rm) {
        double totalInol = 0.0;

        for (SetEntry set : exerciseEntry.getSets()) {
            if (set.getWeight() == null || set.getWeight() <= 0) {
                continue;
            }

            double intensityPct = (set.getWeight() / ref1rm) * 100.0;

            if (intensityPct >= 99.5) {
                intensityPct = 99.0;
            }
            if (intensityPct < 1.0) {
                intensityPct = 1.0;
            }

            double setInol = set.getReps() / (100.0 - intensityPct);
            totalInol += setInol;
        }

        return totalInol;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int computeAndPersistBackfill(WorkoutEntry entry, UUID userId) {
        inolRepository.deleteByWorkoutEntryId(entry.getId());

        if (entry.getExercises() == null || entry.getExercises().isEmpty()) {
            return 0;
        }

        int processed = 0;

        for (ExerciseEntry exerciseEntry : entry.getExercises()) {
            if (exerciseEntry.getExerciseDefinition() == null) {
                log.debug("Skipping backfill INOL for exercise without definition: {}",
                        exerciseEntry.getLoggedExerciseName());
                continue;
            }

            Optional<BlockAwareOneRmService.OneRmResult> oneRmOpt =
                    oneRmService.resolveOneRmWindowed(
                            exerciseEntry.getExerciseDefinition().getId(),
                            userId,
                            entry.getCreatedAt()
                    );

            if (oneRmOpt.isEmpty()) {
                oneRmOpt = oneRmService.estimateOneRmFromSets(exerciseEntry.getSets());
            }

            if (oneRmOpt.isEmpty()) {
                log.debug("Skipping backfill INOL for {} — no 1RM estimable",
                        exerciseEntry.getLoggedExerciseName());
                continue;
            }

            BlockAwareOneRmService.OneRmResult oneRm = oneRmOpt.get();
            double ref1rm = MathUtils.medianOfThree(oneRm.epley(), oneRm.bryzycki(), oneRm.lombardi());
            double exerciseInol = computeExerciseInol(exerciseEntry, ref1rm);

            String exerciseName = exerciseEntry.getLoggedExerciseName() != null
                    ? exerciseEntry.getLoggedExerciseName()
                    : exerciseEntry.getExerciseDefinition().getExerciseName();

            WorkoutInol inol = new WorkoutInol(
                    userId,
                    entry,
                    exerciseEntry,
                    exerciseName,
                    MathUtils.roundTo2Decimals(exerciseInol),
                    MathUtils.roundTo1Decimal(ref1rm),
                    null,
                    true
            );
            inol.setBackfilled(true);

            inolRepository.save(inol);
            processed++;
        }

        return processed;
    }
}
