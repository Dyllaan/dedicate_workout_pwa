package com.louisfiges.workout.analysis;

import java.util.Map;

public final class RpePercentageLookup {

    private static final Map<String, Double> TABLE = Map.ofEntries(
        // (reps, RPE) -> %1RM
        //  1 rep
        Map.entry("1-6.0", 95.0), Map.entry("1-7.0", 96.0), Map.entry("1-8.0", 97.0),
        Map.entry("1-9.0", 98.0), Map.entry("1-10.0", 100.0),
        //  2 reps
        Map.entry("2-6.0", 93.0), Map.entry("2-7.0", 94.0), Map.entry("2-8.0", 95.0),
        Map.entry("2-9.0", 96.0), Map.entry("2-10.0", 98.0),
        //  3 reps
        Map.entry("3-6.0", 86.0), Map.entry("3-7.0", 89.0), Map.entry("3-8.0", 92.0),
        Map.entry("3-9.0", 94.0), Map.entry("3-10.0", 96.0),
        //  4 reps
        Map.entry("4-6.0", 85.0), Map.entry("4-7.0", 87.0), Map.entry("4-8.0", 90.0),
        Map.entry("4-9.0", 93.0), Map.entry("4-10.0", 95.0),
        //  5 reps
        Map.entry("5-6.0", 83.0), Map.entry("5-7.0", 86.0), Map.entry("5-8.0", 89.0),
        Map.entry("5-9.0", 91.0), Map.entry("5-10.0", 93.0),
        //  6 reps
        Map.entry("6-6.0", 82.0), Map.entry("6-7.0", 85.0), Map.entry("6-8.0", 88.0),
        Map.entry("6-9.0", 90.0), Map.entry("6-10.0", 92.0),
        //  7 reps
        Map.entry("7-6.0", 81.0), Map.entry("7-7.0", 84.0), Map.entry("7-8.0", 87.0),
        Map.entry("7-9.0", 89.0), Map.entry("7-10.0", 91.0),
        //  8 reps
        Map.entry("8-6.0", 80.0), Map.entry("8-7.0", 83.0), Map.entry("8-8.0", 86.0),
        Map.entry("8-9.0", 88.0), Map.entry("8-10.0", 90.0),
        //  9 reps
        Map.entry("9-6.0", 78.0), Map.entry("9-7.0", 81.0), Map.entry("9-8.0", 84.0),
        Map.entry("9-9.0", 86.0), Map.entry("9-10.0", 88.0),
        // 10 reps
        Map.entry("10-6.0", 76.0), Map.entry("10-7.0", 79.0), Map.entry("10-8.0", 82.0),
        Map.entry("10-9.0", 84.0), Map.entry("10-10.0", 86.0),
        // 11 reps
        Map.entry("11-6.0", 74.0), Map.entry("11-7.0", 77.0), Map.entry("11-8.0", 80.0),
        Map.entry("11-9.0", 82.0), Map.entry("11-10.0", 84.0),
        // 12 reps
        Map.entry("12-6.0", 72.0), Map.entry("12-7.0", 75.0), Map.entry("12-8.0", 78.0),
        Map.entry("12-9.0", 80.0), Map.entry("12-10.0", 82.0),
        // 13 reps
        Map.entry("13-6.0", 70.0), Map.entry("13-7.0", 73.0), Map.entry("13-8.0", 76.0),
        Map.entry("13-9.0", 78.0), Map.entry("13-10.0", 80.0),
        // 14 reps
        Map.entry("14-6.0", 68.0), Map.entry("14-7.0", 71.0), Map.entry("14-8.0", 74.0),
        Map.entry("14-9.0", 76.0), Map.entry("14-10.0", 78.0),
        // 15 reps
        Map.entry("15-6.0", 66.0), Map.entry("15-7.0", 69.0), Map.entry("15-8.0", 72.0),
        Map.entry("15-9.0", 74.0), Map.entry("15-10.0", 76.0)
    );

    private RpePercentageLookup() {}

    public static double getIntensityPct(int reps, double rpe) {
        int clampedReps = Math.max(1, Math.min(15, reps));
        double clampedRpe = Math.max(6.0, Math.min(10.0, rpe));

        double lowerRpe = Math.floor(clampedRpe);
        double upperRpe = Math.ceil(clampedRpe);

        if (lowerRpe == upperRpe) {
            String key = clampedReps + "-" + String.format("%.1f", clampedRpe);
            return TABLE.getOrDefault(key, 100.0);
        }

        String lowerKey = clampedReps + "-" + String.format("%.1f", lowerRpe);
        String upperKey = clampedReps + "-" + String.format("%.1f", upperRpe);

        double lowerPct = TABLE.getOrDefault(lowerKey, 100.0);
        double upperPct = TABLE.getOrDefault(upperKey, 100.0);
        double t = (clampedRpe - lowerRpe) / (upperRpe - lowerRpe);

        return lowerPct + t * (upperPct - lowerPct);
    }
}
