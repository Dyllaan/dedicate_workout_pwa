package com.louisfiges.workout.analysis;

import com.louisfiges.workout.analysis.types.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Analyses exercise history to produce context-aware progression suggestions
 *
 * Supports multiple progression strategies (weight, reps, volume) and uses
 * RPE data when available to make smarter recommendations
 *
 * When a BlockContext is provided, strategy is driven by the block config,
 * RPE thresholds are block-aware, and deload weeks are handled automatically
 */
@Component
public class ProgressionAnalyser {

    private final int MIN_SESSIONS_FOR_ANALYSIS = 2;
    private final int FAILED_ATTEMPTS_BEFORE_DELOAD = 2;
    private final double RPE_PROGRESSION_CEILING = 8.5; // default when no block context
    private final double RPE_DELOAD_FLOOR = 9.5;
    private final double DELOAD_WEIGHT_FACTOR = 0.85;

    private final double INCREMENT_UPPER = 2.5;
    private final double INCREMENT_LOWER = 5.0;

    public ProgressionAnalyser(@Value("${plateau.window}") int plateauWindow) {
    }

    /**
     * Block-aware analysis. Strategy, RPE thresholds, and deload logic are all
     * driven by the BlockContext rather than chosen manually.
     */
    public ProgressionSuggestion analyse(
            List<ExerciseSession> history,
            ExerciseType exerciseType,
            BlockContext blockContext
    ) {
        if (history == null || history.isEmpty()) {
            return ProgressionSuggestion.insufficient("No exercise history available.");
        }

        // Deload week — always recommend deload regardless of performance numbers
        if (blockContext.isDeloadWeek()) {
            ExerciseSession latest = history.get(0);
            double deloadWeight = latest.getWeightKg() * DELOAD_WEIGHT_FACTOR;
            return ProgressionSuggestion.deload(
                    deloadWeight,
                    String.format(
                            "This is your deload week. Drop to %.1fkg, keep the movement quality high, " +
                                    "and let the fatigue clear.",
                            deloadWeight
                    )
            );
        }

        ExerciseSession latest = history.get(0);
        if (latest.hasRpeData()) {
            SessionStreak streak = evaluateStreak(history, latest.getWeightKg());
            return analyseWithRpe(
                    latest,
                    streak,
                    latest.getWeightKg(),
                    resolveIncrement(exerciseType),
                    blockContext.targetRpeMax()
            );
        }

        if (history.size() < MIN_SESSIONS_FOR_ANALYSIS) {
            return ProgressionSuggestion.maintain(
                    latest.getWeightKg(),
                    String.format(
                            "Keep working at %.1fkg - need at least %d sessions to make a recommendation.",
                            latest.getWeightKg(), MIN_SESSIONS_FOR_ANALYSIS
                    )
            );
        }

        double currentWeight = latest.getWeightKg();
        double increment = resolveIncrement(exerciseType);
        boolean isFinalWeek = blockContext.currentWeek() == blockContext.totalWeeks();

        ProgressionSuggestion base = switch (blockContext.progressionStrategy()) {
            case WEIGHT_FIRST -> analyseWeightProgression(
                    history, currentWeight, increment, blockContext.targetRpeMax()
            );
            case REPS_FIRST -> analyseRepProgression(history, currentWeight, increment);
            case VOLUME -> analyseVolumeProgression(history, currentWeight, increment);
        };

        // Final week of block append heads-up about upcoming deload
        if (isFinalWeek && base.getType() != SuggestionType.DELOAD) {
            return ProgressionSuggestion.maintain(
                    base.getSuggestedWeightKg(),
                    base.getReasoning() + " Next week is your deload — don't grind to failure this session."
            );
        }

        return base;
    }

    /**
     * used when no block context
     */
    public ProgressionSuggestion analyse(
            List<ExerciseSession> history,
            ExerciseType exerciseType,
            ProgressionStrategy strategy
    ) {
        if (history == null || history.isEmpty()) {
            return ProgressionSuggestion.insufficient("No exercise history available.");
        }

        if (history.size() < MIN_SESSIONS_FOR_ANALYSIS) {
            ExerciseSession latest = history.get(0);
            return ProgressionSuggestion.maintain(
                    latest.getWeightKg(),
                    String.format(
                            "Keep working at %.1fkg - need at least %d sessions to make a recommendation.",
                            latest.getWeightKg(), MIN_SESSIONS_FOR_ANALYSIS
                    )
            );
        }

        ExerciseSession latest = history.get(0);
        double currentWeight = latest.getWeightKg();
        double increment = resolveIncrement(exerciseType);

        return switch (strategy) {
            case WEIGHT_FIRST -> analyseWeightProgression(
                    history, currentWeight, increment, RPE_PROGRESSION_CEILING
            );
            case REPS_FIRST -> analyseRepProgression(history, currentWeight, increment);
            case VOLUME -> analyseVolumeProgression(history, currentWeight, increment);
        };
    }

    /**
     * Convenience overload defaults to weight-first with default RPE ceiling.
     */
    public ProgressionSuggestion analyse(
            List<ExerciseSession> history,
            ExerciseType exerciseType
    ) {
        return analyse(history, exerciseType, ProgressionStrategy.WEIGHT_FIRST);
    }

    /**
     * Standard strength progression: hit target reps consistently, then add weight.
     * Uses RPE when available to make smarter calls.
     */
    private ProgressionSuggestion analyseWeightProgression(
            List<ExerciseSession> history,
            double currentWeight,
            double increment,
            double rpeProgressionCeiling
    ) {
        ExerciseSession latest = history.get(0);
        SessionStreak streak = evaluateStreak(history, currentWeight);

        if (latest.hasRpeData()) {
            return analyseWithRpe(latest, streak, currentWeight, increment, rpeProgressionCeiling);
        }

        // Multiple consecutive failures = deload
        if (streak.consecutiveFailures() >= FAILED_ATTEMPTS_BEFORE_DELOAD) {
            double deloadWeight = Math.max(0, currentWeight - increment);
            return ProgressionSuggestion.deload(
                    deloadWeight,
                    String.format(
                            "You've missed target reps %d times in a row at %.1fkg. " +
                                    "Drop to %.1fkg, nail your reps, then work back up.",
                            streak.consecutiveFailures(), currentWeight, deloadWeight
                    )
            );
        }

        // Recent failure but not enough to trigger deload
        if (!latest.isAllSetsSuccessful()) {
            int completionPercent = latest.getRepCompletionPercent();
            return ProgressionSuggestion.maintain(
                    currentWeight,
                    String.format(
                            "You hit %d%% of target reps at %.1fkg last session. " +
                                    "Stay here and aim to complete all sets before moving up.",
                            completionPercent, currentWeight
                    )
            );
        }

        // Consistent success = progress
        if (streak.consecutiveSuccesses() >= 2) {
            double suggestedWeight = currentWeight + increment;
            return ProgressionSuggestion.increase(
                    suggestedWeight,
                    String.format(
                            "You've hit all target reps for %d sessions at %.1fkg. Move up to %.1fkg.",
                            streak.consecutiveSuccesses(), currentWeight, suggestedWeight
                    )
            );
        }

        return ProgressionSuggestion.maintain(
                currentWeight,
                String.format(
                        "Good session at %.1fkg. Hit it again next time and you'll be ready to progress.",
                        currentWeight
                )
        );
    }

    /**
     * RPE-aware analysis. Uses block RPE ceiling rather than a hardcoded constant
     * so the threshold is appropriate for the current training phase
     *
     * RPE 8 in a hypertrophy block = progress. RPE 8 in a peaking block = plenty left.
     */
    private ProgressionSuggestion analyseWithRpe(
            ExerciseSession latest,
            SessionStreak streak,
            double currentWeight,
            double increment,
            double rpeProgressionCeiling
    ) {
        double avgRpe = latest.getAverageRpe();

        // Hit all reps and RPE indicates room to grow
        if (latest.isAllSetsSuccessful() && avgRpe <= rpeProgressionCeiling) {
            double suggestedWeight = currentWeight + increment;
            return ProgressionSuggestion.increase(
                    suggestedWeight,
                    String.format(
                            "All sets completed at RPE %.1f - within your block target. Try %.1fkg next session.",
                            avgRpe, suggestedWeight
                    )
            );
        }

        // Successful but outside the block target — stay put and keep the work controlled.
        if (latest.isAllSetsSuccessful()) {
            return ProgressionSuggestion.maintain(
                    currentWeight,
                    String.format(
                            "You completed all sets but RPE %.1f is above your block target of %.1f. " +
                                    "Stay at %.1fkg until it feels more controlled.",
                            avgRpe, rpeProgressionCeiling, currentWeight
                    )
            );
        }

        // Failed reps at high RPE with repeated failures = deload
        if (!latest.isAllSetsSuccessful() && avgRpe >= RPE_DELOAD_FLOOR
                && streak.consecutiveFailures() >= FAILED_ATTEMPTS_BEFORE_DELOAD) {
            double deloadWeight = Math.max(0, currentWeight - increment);
            return ProgressionSuggestion.deload(
                    deloadWeight,
                    String.format(
                            "Missed reps at RPE %.1f for %d sessions - %.1fkg is too heavy right now. " +
                                    "Drop to %.1fkg and rebuild.",
                            avgRpe, streak.consecutiveFailures(), currentWeight, deloadWeight
                    )
            );
        }

        return ProgressionSuggestion.maintain(
                currentWeight,
                String.format(
                        "Stay at %.1fkg. Aim to bring RPE within your block target of %.1f while hitting all reps.",
                        currentWeight, rpeProgressionCeiling
                )
        );
    }

    /**
     * Hypertrophy-style: add reps within a range before adding weight.
     * e.g. 3x8 = 3x10 = 3x12 = add weight, back to 3x8.
     */
    private ProgressionSuggestion analyseRepProgression(
            List<ExerciseSession> history,
            double currentWeight,
            double increment
    ) {
        ExerciseSession latest = history.get(0);

        if (!latest.hasRepRange()) {
            return analyseWeightProgression(history, currentWeight, increment, RPE_PROGRESSION_CEILING);
        }

        int avgReps = latest.getAverageRepsPerSet();
        int maxRep = latest.getTargetRepRange().upper();

        // Hit the top of the rep range = add weight, drop reps back down
        if (latest.isAllSetsSuccessful() && avgReps >= maxRep) {
            double suggestedWeight = currentWeight + increment;
            int minRep = latest.getTargetRepRange().lower();
            return ProgressionSuggestion.increase(
                    suggestedWeight,
                    String.format(
                            "You're hitting %d reps across all sets at %.1fkg - top of your range. " +
                                    "Move to %.1fkg and work back from %d reps.",
                            avgReps, currentWeight, suggestedWeight, minRep
                    )
            );
        }

        // Still within the rep range — add reps next session
        if (latest.isAllSetsSuccessful()) {
            return ProgressionSuggestion.maintain(
                    currentWeight,
                    String.format(
                            "Good work at %d reps. Stay at %.1fkg and aim for %d reps next session.",
                            avgReps, currentWeight, Math.min(avgReps + 1, maxRep)
                    )
            );
        }

        return ProgressionSuggestion.maintain(
                currentWeight,
                String.format(
                        "Stay at %.1fkg and focus on hitting %d clean reps on every set.",
                        currentWeight, avgReps
                )
        );
    }

    /**
     * Volume progression: total tonnage (sets × reps × weight) is the driver.
     * Good for intermediate lifters who need more volume to grow.
     */
    private ProgressionSuggestion analyseVolumeProgression(
            List<ExerciseSession> history,
            double currentWeight,
            double increment
    ) {
        if (history.size() < 2) {
            return ProgressionSuggestion.maintain(currentWeight, "Need more data to assess volume trends.");
        }

        double latestVolume = history.get(0).getTotalVolume();
        double previousVolume = history.get(1).getTotalVolume();
        double volumeChange = ((latestVolume - previousVolume) / previousVolume) * 100.0;

        // Volume increasing — keep going
        if (volumeChange > 5.0) {
            return ProgressionSuggestion.maintain(
                    currentWeight,
                    String.format(
                            "Volume up %.1f%% session-over-session (%.0fkg total). Keep pushing - " +
                                    "when you plateau on volume, bump the weight.",
                            volumeChange, latestVolume
                    )
            );
        }

        // Volume stagnant and completing all sets — increase weight
        if (volumeChange <= 5.0 && history.get(0).isAllSetsSuccessful()) {
            double suggestedWeight = currentWeight + increment;
            return ProgressionSuggestion.increase(
                    suggestedWeight,
                    String.format(
                            "Volume has stalled at ~%.0fkg total. You're completing all sets - " +
                                    "try %.1fkg to force adaptation.",
                            latestVolume, suggestedWeight
                    )
            );
        }

        return ProgressionSuggestion.maintain(
                currentWeight,
                String.format(
                        "Stay at %.1fkg and try to add a rep or a set to push total volume up.",
                        currentWeight
                )
        );
    }

    private SessionStreak evaluateStreak(List<ExerciseSession> history, double weight) {
        int successes = 0;
        int failures = 0;

        for (ExerciseSession session : history) {
            if (Math.abs(session.getWeightKg() - weight) > 0.01) break;

            if (session.isAllSetsSuccessful()) {
                if (failures == 0) successes++;
                else break;
            } else {
                if (successes == 0) failures++;
                else break;
            }
        }

        return new SessionStreak(successes, failures);
    }

    private double resolveIncrement(ExerciseType type) {
        return switch (type) {
            case LOWER_BODY -> INCREMENT_LOWER;
            default -> INCREMENT_UPPER;
        };
    }

    private record SessionStreak(int consecutiveSuccesses, int consecutiveFailures) {}
}
