package com.louisfiges.workout.repository;

import java.util.List;
import java.util.UUID;

public interface WorkoutEntryStartupReadRepository {

    List<WorkoutEntryStartupSummaryRow> summarizeForStartupByTemplateIds(UUID userId, List<UUID> templateIds);
}
