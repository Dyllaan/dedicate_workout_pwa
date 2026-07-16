package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryBlockContextDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryGroupDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryResponseDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySessionDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySetDTO;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TemplateAnalysisInputResolver {

    private static final double DEFAULT_TARGET_RPE = 8.0;
    private static final double DEFAULT_PLATE_INCREMENT_KG = 2.5;

    private final WorkoutTemplateRepository workoutTemplateRepository;
    private final WorkoutEntryRepository workoutEntryRepository;
    private final ActiveBlockContextResolver activeBlockContextResolver;
    private final TopSetInferenceService topSetInferenceService;

    public TemplateAnalysisInputResolver(
            WorkoutTemplateRepository workoutTemplateRepository,
            WorkoutEntryRepository workoutEntryRepository,
            ActiveBlockContextResolver activeBlockContextResolver
    ) {
        this(workoutTemplateRepository, workoutEntryRepository, activeBlockContextResolver, new TopSetInferenceService());
    }

    @Autowired
    public TemplateAnalysisInputResolver(
            WorkoutTemplateRepository workoutTemplateRepository,
            WorkoutEntryRepository workoutEntryRepository,
            ActiveBlockContextResolver activeBlockContextResolver,
            TopSetInferenceService topSetInferenceService
    ) {
        this.workoutTemplateRepository = workoutTemplateRepository;
        this.workoutEntryRepository = workoutEntryRepository;
        this.activeBlockContextResolver = activeBlockContextResolver;
        this.topSetInferenceService = topSetInferenceService;
    }

    public ResolvedTemplateAnalysisInput resolve(UUID userId, UUID templateId) {
        return resolve(userId, templateId, null, null, null);
    }

    public ResolvedTemplateAnalysisInput resolve(
            UUID userId,
            UUID templateId,
            Integer limit,
            LocalDate startDate,
            LocalDate endDate
    ) {
        WorkoutTemplate template = workoutTemplateRepository.findByIdAndUserId(templateId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout template not found"));

        ExerciseConfig focus = template.getExercises().stream()
                .filter(exercise -> Boolean.TRUE.equals(exercise.getFocus()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Workout template must have a focused exercise"));

        ExerciseDefinition definition = focus.getExerciseDefinition();
        if (definition == null || definition.getId() == null) {
            throw new BadRequestException("Focused exercise definition is required");
        }

        ActiveBlockContextResolver.ResolvedActiveBlockContext activeBlockContext = activeBlockContextResolver.resolve(userId);
        ExerciseHistoryResponseDTO history = buildHistory(
                userId,
                templateId,
                definition.getId(),
                activeBlockContext.dto(),
                limit,
                startDate,
                endDate
        );
        LatestSession latestSession = resolveLatestSession(history);

        double plateIncrementKg = resolvePlateIncrement(definition);
        int plannedReps = resolvePlannedReps(focus, latestSession);
        double plannedWeight = resolvePlannedWeight(latestSession, plateIncrementKg);
        double targetRpe = resolveTargetRpe(activeBlockContext, latestSession);

        return new ResolvedTemplateAnalysisInput(
                template.getId(),
                definition.getId(),
                history,
                activeBlockContext,
                plannedWeight,
                plannedReps,
                targetRpe,
                plateIncrementKg
        );
    }

    private ExerciseHistoryResponseDTO buildHistory(
            UUID userId,
            UUID templateId,
            UUID exerciseDefinitionId,
            ExerciseHistoryBlockContextDTO blockContext,
            Integer limit,
            LocalDate startDate,
            LocalDate endDate
    ) {
        List<WorkoutEntry> entries = workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(templateId, userId);
        if (startDate != null || endDate != null) {
            entries = entries.stream()
                    .filter(entry -> entry != null && entry.getCreatedAt() != null)
                    .filter(entry -> {
                        LocalDate performedDate = entry.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                        boolean afterStart = startDate == null || !performedDate.isBefore(startDate);
                        boolean beforeEnd = endDate == null || !performedDate.isAfter(endDate);
                        return afterStart && beforeEnd;
                    })
                    .toList();
        }

        if (limit != null && limit > 0) {
            entries = entries.stream()
                    .limit(limit)
                    .toList();
        }

        List<ExerciseHistorySessionSlice> slices = new ArrayList<>();

        for (WorkoutEntry entry : entries) {
            if (entry == null || entry.getCreatedAt() == null || entry.getExercises() == null) {
                continue;
            }

            for (ExerciseEntry exerciseEntry : entry.getExercises()) {
                if (!matchesExercise(exerciseEntry, exerciseDefinitionId)) {
                    continue;
                }

                java.time.LocalDate performedDate = entry.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                slices.add(new ExerciseHistorySessionSlice(
                        performedDate,
                        entry.getCreatedAt(),
                        entry.getId(),
                        entry.getTemplate() == null ? null : entry.getTemplate().getId(),
                        blockContext,
                        exerciseEntry
                ));
            }
        }

        Map<java.time.LocalDate, List<ExerciseHistorySessionSlice>> grouped = slices.stream()
                .sorted(Comparator
                        .comparing(ExerciseHistorySessionSlice::performedAt)
                        .thenComparing(ExerciseHistorySessionSlice::date)
                        .thenComparing(ExerciseHistorySessionSlice::workoutEntryId, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.groupingBy(
                        ExerciseHistorySessionSlice::date,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<ExerciseHistoryGroupDTO> groups = new ArrayList<>();
        int groupOrder = 1;
        for (Map.Entry<java.time.LocalDate, List<ExerciseHistorySessionSlice>> entry : grouped.entrySet()) {
            List<ExerciseHistorySessionDTO> sessions = new ArrayList<>();
            int sessionOrder = 1;
            entry.getValue().sort(Comparator
                    .comparing(ExerciseHistorySessionSlice::performedAt)
                    .thenComparing(ExerciseHistorySessionSlice::workoutEntryId, Comparator.nullsLast(Comparator.naturalOrder())));
            for (ExerciseHistorySessionSlice slice : entry.getValue()) {
                sessions.add(toSessionDto(slice, sessionOrder++));
            }
            groups.add(new ExerciseHistoryGroupDTO(entry.getKey(), groupOrder++, sessions));
        }

        return new ExerciseHistoryResponseDTO(exerciseDefinitionId, resolveExerciseName(entries, exerciseDefinitionId), groups);
    }

    private boolean matchesExercise(ExerciseEntry exerciseEntry, UUID exerciseDefinitionId) {
        return exerciseEntry != null
                && exerciseEntry.getExerciseDefinition() != null
                && exerciseDefinitionId.equals(exerciseEntry.getExerciseDefinition().getId());
    }

    private ExerciseHistorySessionDTO toSessionDto(ExerciseHistorySessionSlice slice, int sessionOrder) {
        List<ExerciseHistorySetDTO> setDtos = topSetInferenceService.inferHistorySets(slice.exerciseEntry());

        return new ExerciseHistorySessionDTO(
                sessionOrder,
                slice.performedAt(),
                slice.workoutEntryId(),
                slice.workoutTemplateId(),
                slice.blockContext(),
                setDtos
        );
    }

    private String resolveExerciseName(List<WorkoutEntry> entries, UUID exerciseDefinitionId) {
        for (WorkoutEntry entry : entries) {
            if (entry == null || entry.getExercises() == null) {
                continue;
            }
            for (ExerciseEntry exerciseEntry : entry.getExercises()) {
                if (matchesExercise(exerciseEntry, exerciseDefinitionId)
                        && exerciseEntry.getExerciseDefinition().getExerciseName() != null) {
                    return exerciseEntry.getExerciseDefinition().getExerciseName();
                }
            }
        }
        return "Unknown exercise";
    }

    private LatestSession resolveLatestSession(ExerciseHistoryResponseDTO history) {
        if (history == null || history.historyGroups() == null) {
            return null;
        }

        return history.historyGroups().stream()
                .filter(java.util.Objects::nonNull)
                .flatMap(group -> group.sessions() == null
                        ? java.util.stream.Stream.<SessionWithGroupContext>empty()
                        : group.sessions().stream()
                        .filter(java.util.Objects::nonNull)
                        .map(session -> {
                            LatestSet latestSet = resolveLatestSet(session);
                            return latestSet == null ? null : new SessionWithGroupContext(group, session, latestSet);
                        }))
                .filter(java.util.Objects::nonNull)
                .max(Comparator
                        .comparing((SessionWithGroupContext candidate) -> candidate.session().performedAt(), Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(candidate -> candidate.group().date(), Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparingInt(candidate -> candidate.group().groupOrder())
                        .thenComparingInt(candidate -> candidate.session().sessionOrder()))
                .map(candidate -> new LatestSession(candidate.session(), candidate.latestSet()))
                .orElse(null);
    }

    private LatestSet resolveLatestSet(ExerciseHistorySessionDTO session) {
        if (session == null || session.sets() == null) {
            return null;
        }

        return session.sets().stream()
                .filter(set -> set != null && set.weight() != null && set.weight() > 0.0 && set.reps() > 0)
                .max(Comparator
                        .comparingDouble(ExerciseHistorySetDTO::weight)
                        .thenComparingInt(ExerciseHistorySetDTO::reps)
                        .thenComparingInt(ExerciseHistorySetDTO::setOrder))
                .map(LatestSet::new)
                .orElse(null);
    }

    private double resolvePlannedWeight(LatestSession latestSession, double plateIncrementKg) {
        if (latestSession != null && latestSession.latestSet() != null) {
            return round(latestSession.latestSet().set().weight());
        }
        return round(Math.max(plateIncrementKg, DEFAULT_PLATE_INCREMENT_KG));
    }

    private int resolvePlannedReps(ExerciseConfig focus, LatestSession latestSession) {
        if (focus.getGoalReps() != null && focus.getGoalReps() > 0) {
            return focus.getGoalReps();
        }
        if (latestSession != null && latestSession.latestSet() != null) {
            return Math.max(1, latestSession.latestSet().set().reps());
        }
        return 1;
    }

    private double resolveTargetRpe(
            ActiveBlockContextResolver.ResolvedActiveBlockContext activeBlockContext,
            LatestSession latestSession
    ) {
        if (activeBlockContext != null && activeBlockContext.blockContext() != null) {
            return activeBlockContext.blockContext().targetRpeMax();
        }
        if (latestSession != null && latestSession.latestSet() != null && latestSession.latestSet().set().rpe() != null) {
            return latestSession.latestSet().set().rpe();
        }
        return DEFAULT_TARGET_RPE;
    }

    private double resolvePlateIncrement(ExerciseDefinition definition) {
        if (definition.getExerciseInfo() == null || definition.getExerciseInfo().getEquipmentLookup() == null) {
            return DEFAULT_PLATE_INCREMENT_KG;
        }

        String equipment = normalize(definition.getExerciseInfo().getEquipmentLookup().getName());
        if (equipment.contains("barbell")) {
            return 1.25;
        }
        if (equipment.contains("dumbbell")) {
            return 2.5;
        }
        return DEFAULT_PLATE_INCREMENT_KG;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    record ResolvedTemplateAnalysisInput(
            UUID templateId,
            UUID exerciseDefinitionId,
            ExerciseHistoryResponseDTO history,
            ActiveBlockContextResolver.ResolvedActiveBlockContext activeBlockContext,
            double plannedWeight,
            int plannedReps,
            double targetRpe,
            double plateIncrementKg
    ) {
    }

    private record LatestSession(ExerciseHistorySessionDTO session, LatestSet latestSet) {
    }

    private record SessionWithGroupContext(
            ExerciseHistoryGroupDTO group,
            ExerciseHistorySessionDTO session,
            LatestSet latestSet
    ) {
    }

    private record LatestSet(ExerciseHistorySetDTO set) {
    }

    private record ExerciseHistorySessionSlice(
            java.time.LocalDate date,
            Instant performedAt,
            UUID workoutEntryId,
            UUID workoutTemplateId,
            ExerciseHistoryBlockContextDTO blockContext,
            ExerciseEntry exerciseEntry
    ) {
    }
}
