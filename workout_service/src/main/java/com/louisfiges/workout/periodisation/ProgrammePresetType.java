package com.louisfiges.workout.periodisation;

public enum ProgrammePresetType {
    HYPERTROPHY,
    STRENGTH,
    HYPERTROPHY_STRENGTH,
    FULL_CYCLE,
    POWERLIFT_MEET_PREP,
    CUSTOM;

    public static ProgrammePresetType fromPreset(PresetType presetType) {
        if (presetType == null) {
            return CUSTOM;
        }

        return switch (presetType) {
            case HYPERTROPHY -> HYPERTROPHY;
            case STRENGTH -> STRENGTH;
            case HYPERTROPHY_STRENGTH -> HYPERTROPHY_STRENGTH;
            case FULL_CYCLE -> FULL_CYCLE;
            case POWERLIFT_MEET_PREP -> POWERLIFT_MEET_PREP;
        };
    }
}
