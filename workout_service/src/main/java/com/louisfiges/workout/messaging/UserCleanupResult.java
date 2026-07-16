package com.louisfiges.workout.messaging;

record UserCleanupResult(
        int deletedEntries,
        int deletedProgrammes,
        int deletedSplits,
        int deletedTemplates
) {
}
