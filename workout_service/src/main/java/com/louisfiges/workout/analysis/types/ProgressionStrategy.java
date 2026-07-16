package com.louisfiges.workout.analysis.types;

public enum ProgressionStrategy {
    WEIGHT_FIRST,   // strength: add weight when reps are consistent
    REPS_FIRST,     // hypertrophy: fill the rep range then add weight
    VOLUME          // intermediate: chase total tonnage
}