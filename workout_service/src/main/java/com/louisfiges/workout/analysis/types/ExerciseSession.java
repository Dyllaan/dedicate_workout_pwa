package com.louisfiges.workout.analysis.types;

import com.louisfiges.workout.analysis.StrengthCalculator;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * Represents a single exercise session built from aggregated WorkoutSet data.
 *
 * Build via the static factory:
 *   ExerciseSession session = ExerciseSession.fromSets(weightKg, sets, targetRepRange, timestamp);
 */
public class ExerciseSession {

    private final double weightKg;
    private final double estimated1RM;
    private final double totalVolume;
    private final int totalRepsCompleted;
    private final int totalRepsTarget;
    private final double averageRpe;
    private final boolean hasRpeData;
    private final int averageRepsPerSet;
    private final int setCount;
    private final RepRange targetRepRange;
    private final Instant performedAt;
    private final List<SetData> sets;

    public ExerciseSession(Builder builder) {
        this.weightKg = builder.weightKg;
        this.estimated1RM = builder.estimated1RM;
        this.totalVolume = builder.totalVolume;
        this.totalRepsCompleted = builder.totalRepsCompleted;
        this.totalRepsTarget = builder.totalRepsTarget;
        this.averageRpe = builder.averageRpe;
        this.hasRpeData = builder.hasRpeData;
        this.averageRepsPerSet = builder.averageRepsPerSet;
        this.setCount = builder.setCount;
        this.targetRepRange = builder.targetRepRange;
        this.performedAt = builder.performedAt;
        this.sets = builder.sets;
    }

    /**
     * Build a session from raw set data. This is the primary entry point.
     *
     * @param weightKg       Working weight for this exercise
     * @param sets           Individual set results
     * @param targetRepRange Target rep range (nullable - some exercises won't have one)
     * @param performedAt    When the session occurred
     */
    public static ExerciseSession fromSets(
            double weightKg,
            List<SetData> sets,
            RepRange targetRepRange,
            Instant performedAt
    ) {
        Objects.requireNonNull(sets, "sets cannot be null");
        if (sets.isEmpty()) throw new IllegalArgumentException("sets cannot be empty");
        Objects.requireNonNull(performedAt, "performedAt cannot be null");

        int totalCompleted = 0;
        int totalTarget = 0;
        double rpeSum = 0;
        int rpeCount = 0;
        double volume = 0;
        double best1RM = 0;

        StrengthCalculator strengthCalculator = new StrengthCalculator();

        for (SetData set : sets) {
            totalCompleted += set.repsCompleted();
            totalTarget += set.repsTarget();
            volume += weightKg * set.repsCompleted();

            if (set.hasRpe()) {
                rpeSum += set.rpe();
                rpeCount++;
            }

            if (set.repsCompleted() > 0 && set.repsCompleted() <= 12) {
                double setE1RM = strengthCalculator.estimateOneRepMaxMedian(weightKg, set.repsCompleted());
                best1RM = Math.max(best1RM, setE1RM);
            }
        }

        boolean hasRpe = rpeCount > 0;
        double avgRpe = hasRpe ? rpeSum / rpeCount : 0;
        int avgReps = totalCompleted / sets.size();

        return new Builder()
                .weightKg(weightKg)
                .estimated1RM(best1RM)
                .totalVolume(volume)
                .totalRepsCompleted(totalCompleted)
                .totalRepsTarget(totalTarget)
                .averageRpe(avgRpe)
                .hasRpeData(hasRpe)
                .averageRepsPerSet(avgReps)
                .setCount(sets.size())
                .targetRepRange(targetRepRange)
                .performedAt(performedAt)
                .sets(List.copyOf(sets))
                .build();
    }

    // --- Analyser interface ---

    public double getWeightKg() { return weightKg; }

    public double getEstimated1RM() { return estimated1RM; }

    public boolean isAllSetsSuccessful() { return totalRepsCompleted >= totalRepsTarget; }

    public int getRepCompletionPercent() {
        if (totalRepsTarget == 0) return 100;
        return (int) Math.round((totalRepsCompleted / (double) totalRepsTarget) * 100);
    }

    public boolean hasRpeData() { return hasRpeData; }

    public double getAverageRpe() { return averageRpe; }

    public int getAverageRepsPerSet() { return averageRepsPerSet; }

    public boolean hasRepRange() { return targetRepRange != null; }

    public RepRange getTargetRepRange() { return targetRepRange; }

    public double getTotalVolume() { return totalVolume; }

    public Instant getPerformedAt() { return performedAt; }

    public int getSetCount() { return setCount; }

    public List<SetData> getSets() { return sets; }

    // --- Supporting types ---

    /**
     * Individual set result. RPE is optional (pass -1 or use the two-arg factory).
     */
    public record SetData(int repsCompleted, int repsTarget, double rpe) {

        public SetData {
            if (repsCompleted < 0) throw new IllegalArgumentException("repsCompleted cannot be negative");
            if (repsTarget < 0) throw new IllegalArgumentException("repsTarget cannot be negative");
        }

        public static SetData of(int repsCompleted, int repsTarget, double rpe) {
            return new SetData(repsCompleted, repsTarget, rpe);
        }

        public static SetData of(int repsCompleted, int repsTarget) {
            return new SetData(repsCompleted, repsTarget, -1);
        }

        public boolean hasRpe() { return rpe >= 0; }

        public boolean isSuccessful() { return repsCompleted >= repsTarget; }
    }

    public record RepRange(int lower, int upper) {
        public RepRange {
            if (lower < 0 || upper < lower) {
                throw new IllegalArgumentException("Invalid rep range: " + lower + "-" + upper);
            }
        }

        public static RepRange of(int lower, int upper) { return new RepRange(lower, upper); }
    }

    // --- Builder (used internally by fromSets) ---

    private static class Builder {
        private double weightKg;
        private double estimated1RM;
        private double totalVolume;
        private int totalRepsCompleted;
        private int totalRepsTarget;
        private double averageRpe;
        private boolean hasRpeData;
        private int averageRepsPerSet;
        private int setCount;
        private RepRange targetRepRange;
        private Instant performedAt;
        private List<SetData> sets;

        Builder weightKg(double v) { this.weightKg = v; return this; }
        Builder estimated1RM(double v) { this.estimated1RM = v; return this; }
        Builder totalVolume(double v) { this.totalVolume = v; return this; }
        Builder totalRepsCompleted(int v) { this.totalRepsCompleted = v; return this; }
        Builder totalRepsTarget(int v) { this.totalRepsTarget = v; return this; }
        Builder averageRpe(double v) { this.averageRpe = v; return this; }
        Builder hasRpeData(boolean v) { this.hasRpeData = v; return this; }
        Builder averageRepsPerSet(int v) { this.averageRepsPerSet = v; return this; }
        Builder setCount(int v) { this.setCount = v; return this; }
        Builder targetRepRange(RepRange v) { this.targetRepRange = v; return this; }
        Builder performedAt(Instant v) { this.performedAt = v; return this; }
        Builder sets(List<SetData> v) { this.sets = v; return this; }

        ExerciseSession build() { return new ExerciseSession(this); }
    }
}