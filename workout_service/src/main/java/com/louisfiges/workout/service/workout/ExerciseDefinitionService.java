package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscle;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscleRole;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.request.ExerciseDefinitionRequest;
import com.louisfiges.workout.dto.request.ExerciseDefinitionCollapseRequest;
import com.louisfiges.workout.dto.request.ExerciseDefinitionResolveRequest;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionDTO;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionCollapseResponseDTO;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionResolveMatchDTO;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionResolveResponseDTO;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryBlockContextDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryGroupDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryResponseDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySessionDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySetDTO;
import com.louisfiges.workout.dto.responses.heatmap.HeatmapCoverageDTO;
import com.louisfiges.workout.dto.responses.heatmap.MuscleHeatmapResponseDTO;
import com.louisfiges.workout.dto.responses.heatmap.ResolvedExerciseHeatmapDTO;
import com.louisfiges.workout.dto.responses.heatmap.UnmappedExerciseHeatmapDTO;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.heatmap.MuscleGroupId;
import com.louisfiges.workout.repository.ExerciseDefinitionRepository;
import com.louisfiges.workout.repository.ExerciseConfigRepository;
import com.louisfiges.workout.repository.ExerciseEntryRepository;
import com.louisfiges.workout.repository.ExerciseInfoRepository;
import com.louisfiges.workout.repository.ProgrammeRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.repository.ExerciseDefinitionUsageSummaryRow;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.time.temporal.ChronoUnit;

@Service
@Transactional
public class ExerciseDefinitionService {

    private static final String RESOLVE_STATUS_SINGLE_MATCH = "single_match";
    private static final String RESOLVE_STATUS_MULTIPLE_MATCHES = "multiple_matches";
    private static final String RESOLVE_STATUS_NO_MATCH = "no_match";
    private static final double PRIMARY_MUSCLE_WEIGHT = 1.0;
    private static final double SECONDARY_MUSCLE_WEIGHT = 0.35;
    private static final double SYNERGIST_MUSCLE_WEIGHT = 0.2;
    private static final Map<String, MuscleGroupId> MUSCLE_LOOKUP = buildMuscleLookup();
    private static final Map<String, MuscleGroupId> MUSCLE_SYNONYMS = buildMuscleSynonyms();

    private final ExerciseDefinitionRepository exerciseDefinitionRepository;
    private final ExerciseConfigRepository exerciseConfigRepository;
    private final ExerciseEntryRepository exerciseEntryRepository;
    private final ExerciseInfoRepository exerciseInfoRepository;
    private final WorkoutTemplateRepository workoutTemplateRepository;
    private final WorkoutEntryRepository workoutEntryRepository;
    private final ProgrammeRepository programmeRepository;
    private final AnalysisCacheEvictor analysisCacheEvictor;

    public ExerciseDefinitionService(
            ExerciseDefinitionRepository exerciseDefinitionRepository,
            ExerciseConfigRepository exerciseConfigRepository,
            ExerciseEntryRepository exerciseEntryRepository,
            ExerciseInfoRepository exerciseInfoRepository,
            WorkoutTemplateRepository workoutTemplateRepository,
            WorkoutEntryRepository workoutEntryRepository,
            ProgrammeRepository programmeRepository,
            AnalysisCacheEvictor analysisCacheEvictor
    ) {
        this.exerciseDefinitionRepository = exerciseDefinitionRepository;
        this.exerciseConfigRepository = exerciseConfigRepository;
        this.exerciseEntryRepository = exerciseEntryRepository;
        this.exerciseInfoRepository = exerciseInfoRepository;
        this.workoutTemplateRepository = workoutTemplateRepository;
        this.workoutEntryRepository = workoutEntryRepository;
        this.programmeRepository = programmeRepository;
        this.analysisCacheEvictor = analysisCacheEvictor;
    }

    @Transactional(readOnly = true)
    public List<ExerciseDefinitionDTO> list(UUID userId) {
        return exerciseDefinitionRepository.findByUserIdOrderByExerciseNameAscVariantAsc(userId)
                .stream()
                .map(ExerciseDefinition::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<ExerciseDefinitionDTO> list(UUID userId, int page, int size) {
        return list(userId, page, size, null);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ExerciseDefinitionDTO> list(UUID userId, int page, int size, String query) {
        int safePage = Math.max(0, page);
        int safeSize = Math.clamp(size, 1, 25);
        String safeQuery = query == null ? null : query.trim();
        var definitions = safeQuery == null || safeQuery.isBlank()
                ? exerciseDefinitionRepository.findByUserIdOrderByExerciseNameAscVariantAsc(
                        userId,
                        PageRequest.of(safePage, safeSize)
                )
                : exerciseDefinitionRepository.findByUserIdAndQuery(
                        userId,
                        safeQuery,
                        PageRequest.of(safePage, safeSize)
                );
        return PagedResponse.from(
                definitions.map(ExerciseDefinition::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public ExerciseDefinition getRequired(UUID userId, UUID definitionId) {
        return exerciseDefinitionRepository.findByIdAndUserId(definitionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise definition not found"));
    }

    @Transactional(readOnly = true)
    public ExerciseDefinitionDTO getById(UUID userId, UUID definitionId) {
        return getRequired(userId, definitionId).toDTO();
    }

    @Transactional(readOnly = true)
    public ExerciseDefinitionResolveResponseDTO resolveForSearch(UUID userId, ExerciseDefinitionResolveRequest request) {
        if (request == null) {
            throw new BadRequestException("Resolve request is required");
        }

        List<ExerciseDefinition> matches = request.exerciseInfoId() != null
                ? findDefinitionsByExerciseInfo(userId, request.exerciseInfoId())
                : findTypedSearchMatches(userId, request.query(), request.exerciseName(), request.variant());

        List<ExerciseDefinitionResolveMatchDTO> rankedMatches = buildRankedResolveMatches(userId, matches);
        String status = rankedMatches.isEmpty()
                ? RESOLVE_STATUS_NO_MATCH
                : rankedMatches.size() == 1
                ? RESOLVE_STATUS_SINGLE_MATCH
                : RESOLVE_STATUS_MULTIPLE_MATCHES;
        UUID suggestedDefinitionId = rankedMatches.isEmpty() ? null : rankedMatches.get(0).id();

        return new ExerciseDefinitionResolveResponseDTO(status, rankedMatches, suggestedDefinitionId);
    }

    public ExerciseDefinitionCollapseResponseDTO collapse(
            UUID userId,
            UUID canonicalDefinitionId,
            ExerciseDefinitionCollapseRequest request
    ) {
        if (request == null) {
            throw new BadRequestException("Collapse request is required");
        }
        return collapse(userId, canonicalDefinitionId, request.sourceDefinitionIds());
    }

    public ExerciseDefinitionCollapseResponseDTO collapse(
            UUID userId,
            UUID canonicalDefinitionId,
            List<UUID> sourceDefinitionIds
    ) {
        if (canonicalDefinitionId == null) {
            throw new BadRequestException("Canonical definition id is required");
        }
        if (sourceDefinitionIds == null || sourceDefinitionIds.isEmpty()) {
            throw new BadRequestException("At least one source definition must be selected");
        }

        LinkedHashSet<UUID> uniqueSourceIds = new LinkedHashSet<>(sourceDefinitionIds);
        if (uniqueSourceIds.size() != sourceDefinitionIds.size()) {
            throw new BadRequestException("Source definition ids must be unique");
        }
        if (uniqueSourceIds.contains(canonicalDefinitionId)) {
            throw new BadRequestException("Canonical definition cannot be merged into itself");
        }

        ExerciseDefinition canonical = getRequired(userId, canonicalDefinitionId);
        List<ExerciseDefinition> sourceDefinitions = exerciseDefinitionRepository.findByUserIdAndIdIn(
                userId,
                uniqueSourceIds
        );

        if (sourceDefinitions.size() != uniqueSourceIds.size()) {
            throw new ResourceNotFoundException("One or more source definitions were not found");
        }

        List<ExerciseConfig> movedConfigs = exerciseConfigRepository.findAllByExerciseDefinition_IdIn(uniqueSourceIds);
        List<ExerciseEntry> movedEntries = exerciseEntryRepository.findAllByExerciseDefinition_IdIn(uniqueSourceIds);

        for (ExerciseConfig config : movedConfigs) {
            config.setExerciseDefinition(canonical);
        }
        for (ExerciseEntry entry : movedEntries) {
            entry.setExerciseDefinition(canonical);
        }

        if (!movedConfigs.isEmpty()) {
            exerciseConfigRepository.saveAll(movedConfigs);
        }
        if (!movedEntries.isEmpty()) {
            exerciseEntryRepository.saveAll(movedEntries);
        }

        exerciseDefinitionRepository.deleteAll(sourceDefinitions);
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();

        return new ExerciseDefinitionCollapseResponseDTO(
                canonical.getId(),
                List.copyOf(uniqueSourceIds),
                movedConfigs.size(),
                movedEntries.size()
        );
    }

    @Transactional(readOnly = true)
    public MuscleHeatmapResponseDTO getTemplateHeatmap(UUID userId, UUID templateId) {
        WorkoutTemplate template = workoutTemplateRepository.findByIdAndUserId(templateId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout template not found"));
        List<WorkoutEntry> entries = workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(templateId, userId);
        return buildHeatmap("WORKOUT_TEMPLATE", template.getId(), null, null, entries);
    }

    @Transactional(readOnly = true)
    public MuscleHeatmapResponseDTO getEntryHeatmap(UUID userId, UUID entryId) {
        WorkoutEntry entry = workoutEntryRepository.findDetailedByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout entry not found"));
        return buildHeatmap(
                "WORKOUT_ENTRY",
                entry.getTemplate().getId(),
                entry.getId(),
                entry.getCreatedAt(),
                List.of(entry)
        );
    }

    public ExerciseDefinitionDTO upsert(UUID userId, ExerciseDefinitionRequest request) {
        if (request == null) {
            throw new BadRequestException("Exercise definition request is required");
        }

        ExerciseDefinition definition = request.id() == null
                ? findOrCreateByIdentity(userId, request.exerciseName(), request.variant(), request.exerciseInfoId())
                : getRequired(userId, request.id());

        ExerciseInfo info = request.exerciseInfoId() == null ? null : requireExerciseInfo(request.exerciseInfoId());
        if (info != null) {
            definition.setExerciseInfo(info);
            definition.setExerciseName(info.getName());
            definition.setVariant(emptyToNull(info.getVariation()));
        } else if (request.id() == null) {
            definition.setExerciseInfo(null);
            definition.setExerciseName(safeName(request.exerciseName()));
            definition.setVariant(emptyToNull(request.variant()));
        }

        definition.setMappingSource(request.mappingSource() == null ? MappingSource.AUTO : request.mappingSource());
        if (definition.getMappingSource() == MappingSource.MANUAL) {
            definition.setPrimaryMuscle(request.primaryMuscle());
            definition.setSecondaryMuscles(new LinkedHashSet<>(safeSet(request.secondaryMuscles())));
        } else {
            definition.setPrimaryMuscle(null);
            definition.setSecondaryMuscles(new LinkedHashSet<>());
        }

        definition.setNormalizedExerciseName(normalize(definition.getExerciseName()));
        definition.setNormalizedVariant(normalize(definition.getVariant()));
        exerciseDefinitionRepository.save(definition);
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return definition.toDTO();
    }

    public ExerciseDefinition resolveForUser(
            UUID userId,
            UUID exerciseDefinitionId,
            String exerciseName,
            String variant,
            Long exerciseInfoId
    ) {
        if (exerciseDefinitionId != null) {
            return getRequired(userId, exerciseDefinitionId);
        }
        if (exerciseInfoId != null) {
            List<ExerciseDefinition> catalogMatches = findDefinitionsByExerciseInfo(userId, exerciseInfoId);
            if (!catalogMatches.isEmpty()) {
                return rankDefinitionsByUsage(userId, catalogMatches).get(0);
            }
        }
        return findOrCreateByIdentity(userId, exerciseName, variant, exerciseInfoId);
    }

    private List<WorkoutEntry> loadHistoryEntries(UUID userId, LocalDate fromDate, LocalDate toDate) {
        if (fromDate != null && toDate != null) {
            Instant start = fromDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
            Instant end = toInclusiveInstant(toDate);
            return workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(userId, start, end);
        }

        List<WorkoutEntry> entries = workoutEntryRepository.findDetailedHistoryByUserId(userId);
        return entries.stream()
                .filter(entry -> isWithinBounds(entry.getCreatedAt(), fromDate, toDate))
                .toList();
    }
    private List<ExerciseHistorySessionSlice> buildSessionSlices(
            List<WorkoutEntry> historyEntries,
            UUID exerciseDefinitionId,
            List<Programme> programmes
    ) {
        List<ExerciseHistorySessionSlice> sessions = new ArrayList<>();

        for (WorkoutEntry entry : historyEntries) {
            Instant performedAt = entry.getCreatedAt();
            LocalDate performedDate = performedAt.atZone(ZoneId.systemDefault()).toLocalDate();
            ExerciseHistoryBlockContextDTO blockContext = resolveBlockContext(programmes, performedAt);

            for (ExerciseEntry exerciseEntry : entry.getExercises()) {
                if (!isMatchingExercise(exerciseEntry, exerciseDefinitionId)) {
                    continue;
                }

                sessions.add(new ExerciseHistorySessionSlice(
                        performedDate,
                        performedAt,
                        entry.getId(),
                        entry.getTemplate() == null ? null : entry.getTemplate().getId(),
                        blockContext,
                        exerciseEntry
                ));
            }
        }

        return sessions;
    }

    private boolean isMatchingExercise(ExerciseEntry exerciseEntry, UUID exerciseDefinitionId) {
        return exerciseEntry != null
                && exerciseEntry.getExerciseDefinition() != null
                && exerciseDefinitionId.equals(exerciseEntry.getExerciseDefinition().getId());
    }

    private List<ExerciseHistoryGroupDTO> groupSessions(List<ExerciseHistorySessionSlice> sessions) {
        Map<LocalDate, List<ExerciseHistorySessionSlice>> grouped = new LinkedHashMap<>();
        for (ExerciseHistorySessionSlice session : sessions) {
            grouped.computeIfAbsent(session.date(), ignored -> new ArrayList<>()).add(session);
        }

        List<ExerciseHistoryGroupDTO> groups = new ArrayList<>();
        int groupOrder = 1;
        for (Map.Entry<LocalDate, List<ExerciseHistorySessionSlice>> entry : grouped.entrySet()) {
            List<ExerciseHistorySessionDTO> sessionDtos = new ArrayList<>();
            int sessionOrder = 1;
            for (ExerciseHistorySessionSlice slice : entry.getValue()) {
                sessionDtos.add(toSessionDto(slice, sessionOrder++));
            }
            groups.add(new ExerciseHistoryGroupDTO(entry.getKey(), groupOrder++, sessionDtos));
        }
        return groups;
    }

    private ExerciseHistorySessionDTO toSessionDto(ExerciseHistorySessionSlice slice, int sessionOrder) {
        List<ExerciseHistorySetDTO> setDtos = new ArrayList<>();
        List<com.louisfiges.workout.dao.workout.SetEntry> sets = slice.exerciseEntry().getSets();
        for (int i = 0; i < sets.size(); i++) {
            com.louisfiges.workout.dao.workout.SetEntry set = sets.get(i);
            setDtos.add(new ExerciseHistorySetDTO(
                    i + 1,
                    set.getReps(),
                    set.getWeight(),
                    set.getRpe(),
                    set.getNotes(),
                    set.getSetRole()
            ));
        }

        return new ExerciseHistorySessionDTO(
                sessionOrder,
                slice.performedAt(),
                slice.workoutEntryId(),
                slice.workoutTemplateId(),
                slice.blockContext(),
                setDtos
        );
    }

    private ExerciseHistoryBlockContextDTO resolveBlockContext(List<Programme> programmes, Instant performedAt) {
        if (programmes == null || programmes.isEmpty() || performedAt == null) {
            return null;
        }

        Programme programme = programmes.stream()
                .filter(candidate -> candidate.getStartDate() != null && !performedAt.isBefore(candidate.getStartDate()))
                .max(Comparator.comparing(Programme::getStartDate))
                .orElse(null);
        if (programme == null || programme.getBlocks() == null || programme.getBlocks().isEmpty()) {
            return null;
        }

        List<Block> blocks = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();
        Block block = resolveBlock(blocks, performedAt);
        if (block == null) {
            return null;
        }

        Week currentWeek = resolveWeek(block, performedAt);
        double targetRpeMin = currentWeek != null && currentWeek.getRpeOverrideMin() != null
                ? currentWeek.getRpeOverrideMin()
                : block.getTargetRpeMin();
        double targetRpeMax = currentWeek != null && currentWeek.getRpeOverrideMax() != null
                ? currentWeek.getRpeOverrideMax()
                : block.getTargetRpeMax();

        return new ExerciseHistoryBlockContextDTO(
                block.getId(),
                block.getName(),
                block.getBlockType(),
                block.getProgressionStrategy(),
                resolveCurrentWeek(block, performedAt),
                block.getDurationWeeks(),
                currentWeek != null && currentWeek.isDeload(),
                targetRpeMin,
                targetRpeMax,
                block.getRepRangeMin(),
                block.getRepRangeMax()
        );
    }

    private Block resolveBlock(List<Block> blocks, Instant performedAt) {
        if (blocks == null || blocks.isEmpty()) {
            return null;
        }

        return blocks.stream()
                .filter(block -> isCurrentBlock(block, performedAt))
                .findFirst()
                .orElseGet(() -> blocks.stream()
                        .filter(block -> block.getStartDate() != null && !performedAt.isBefore(block.getStartDate()))
                        .max(Comparator.comparing(Block::getStartDate))
                        .orElse(blocks.get(0)));
    }

    private boolean isCurrentBlock(Block block, Instant performedAt) {
        if (block == null || block.getStartDate() == null || performedAt == null) {
            return false;
        }

        Instant blockEnd = block.getStartDate().plus(block.getDurationWeeks() * 7L, ChronoUnit.DAYS);
        return !performedAt.isBefore(block.getStartDate()) && performedAt.isBefore(blockEnd);
    }

    private int resolveCurrentWeek(Block block, Instant performedAt) {
        if (block == null || block.getStartDate() == null || performedAt == null) {
            return 1;
        }

        long daysBetween = ChronoUnit.DAYS.between(block.getStartDate(), performedAt);
        int computedWeek = (int) Math.floor(daysBetween / 7.0) + 1;
        return Math.max(1, Math.min(computedWeek, block.getDurationWeeks()));
    }

    private Week resolveWeek(Block block, Instant performedAt) {
        if (block == null || block.getWeeks() == null || block.getWeeks().isEmpty()) {
            return null;
        }

        int currentWeek = resolveCurrentWeek(block, performedAt);
        return block.getWeeks().stream()
                .filter(week -> week.getWeekNumber() == currentWeek)
                .findFirst()
                .orElse(null);
    }

    private boolean isWithinBounds(Instant createdAt, LocalDate fromDate, LocalDate toDate) {
        if (createdAt == null) {
            return false;
        }

        if (fromDate != null) {
            Instant start = fromDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
            if (createdAt.isBefore(start)) {
                return false;
            }
        }

        if (toDate != null) {
            Instant end = toInclusiveInstant(toDate);
            if (createdAt.isAfter(end)) {
                return false;
            }
        }

        return true;
    }

    private Instant toInclusiveInstant(LocalDate date) {
        return date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().minusNanos(1);
    }

    private MuscleHeatmapResponseDTO buildHeatmap(
            String scope,
            UUID templateId,
            UUID entryId,
            Instant performedAt,
            List<WorkoutEntry> entries
    ) {
        Map<ExerciseIdentityKey, ScopeExercise> scopedExercises = new LinkedHashMap<>();
        Map<MuscleGroupId, Double> rawScores = new LinkedHashMap<>();

        for (WorkoutEntry entry : entries) {
            for (ExerciseEntry exerciseEntry : entry.getExercises()) {
                ExerciseDefinition definition = exerciseEntry.getExerciseDefinition();
                ExerciseIdentityKey key = ExerciseIdentityKey.from(
                        exerciseEntry.getLoggedExerciseName(),
                        exerciseEntry.getLoggedVariant()
                );
                HeatmapResolution occurrenceResolution = resolveHeatmap(definition);
                ScopeExercise existing = scopedExercises.get(key);
                if (existing == null) {
                    scopedExercises.put(
                            key,
                            new ScopeExercise(
                                    safeName(exerciseEntry.getLoggedExerciseName()),
                                    emptyToNull(exerciseEntry.getLoggedVariant()),
                                    definition
                            )
                    );
                } else if (!resolveHeatmap(existing.definition()).isResolved() && occurrenceResolution.isResolved()) {
                    scopedExercises.put(
                            key,
                            new ScopeExercise(
                                    safeName(exerciseEntry.getLoggedExerciseName()),
                                    emptyToNull(exerciseEntry.getLoggedVariant()),
                                    definition
                            )
                    );
                }

                if (occurrenceResolution.isResolved()) {
                    accumulateHeatmap(rawScores, occurrenceResolution);
                }
            }
        }

        List<ResolvedExerciseHeatmapDTO> resolvedExercises = new ArrayList<>();
        List<UnmappedExerciseHeatmapDTO> unmappedExercises = new ArrayList<>();

        for (ScopeExercise scopedExercise : scopedExercises.values()) {
            HeatmapResolution resolution = resolveHeatmap(scopedExercise.definition());
            if (resolution.isResolved()) {
                resolvedExercises.add(resolution.toDto(scopedExercise.displayExerciseName(), scopedExercise.displayVariant()));
            } else {
                unmappedExercises.add(new UnmappedExerciseHeatmapDTO(scopedExercise.displayExerciseName(), scopedExercise.displayVariant()));
            }
        }

        resolvedExercises.sort(Comparator
                .comparing(ResolvedExerciseHeatmapDTO::exerciseName, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(item -> item.variant() == null ? "" : item.variant(), String.CASE_INSENSITIVE_ORDER));
        unmappedExercises.sort(Comparator
                .comparing(UnmappedExerciseHeatmapDTO::exerciseName, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(item -> item.variant() == null ? "" : item.variant(), String.CASE_INSENSITIVE_ORDER));

        HeatmapCoverageDTO coverage = new HeatmapCoverageDTO(
                scopedExercises.size(),
                resolvedExercises.size(),
                unmappedExercises.size()
        );

        return new MuscleHeatmapResponseDTO(
                scope,
                templateId,
                entryId,
                performedAt,
                entries.size(),
                normalise(rawScores),
                coverage,
                resolvedExercises,
                unmappedExercises
        );
    }

    private void accumulateHeatmap(Map<MuscleGroupId, Double> rawScores, HeatmapResolution resolution) {
        rawScores.merge(resolution.primaryMuscle(), PRIMARY_MUSCLE_WEIGHT, Double::sum);
        for (MuscleGroupId secondary : resolution.secondaryMuscles()) {
            rawScores.merge(secondary, SECONDARY_MUSCLE_WEIGHT, Double::sum);
        }
        for (MuscleGroupId synergist : resolution.synergistMuscles()) {
            rawScores.merge(synergist, SYNERGIST_MUSCLE_WEIGHT, Double::sum);
        }
    }

    private HeatmapResolution resolveHeatmap(ExerciseDefinition definition) {
        MappingSource mappingSource = definition.getMappingSource() == null ? MappingSource.AUTO : definition.getMappingSource();
        ExerciseInfo info = definition.getExerciseInfo();
        Long exerciseInfoId = info == null ? null : info.getId();
        String resolvedExerciseName = info != null && !info.getName().isBlank()
                ? info.getName()
                : definition.getExerciseName();

        MuscleGroupId primary = definition.getPrimaryMuscle();
        List<MuscleGroupId> secondary = new ArrayList<>(definition.getSecondaryMuscles() == null
                ? List.of()
                : definition.getSecondaryMuscles());
        List<MuscleGroupId> synergist = List.of();

        if (info != null) {
            List<MuscleGroupId> targetMuscles = parseMuscleGroups(info, ExerciseInfoMuscleRole.TARGET);
            if (primary == null) {
                primary = parseMuscle(nameOf(info.getMainMuscleLookup()))
                        .orElseGet(() -> targetMuscles.stream().findFirst().orElse(null));
            }
            if (secondary.isEmpty()) {
                secondary = parseMuscleGroups(info, ExerciseInfoMuscleRole.TARGET, ExerciseInfoMuscleRole.SECONDARY);
            }
            synergist = parseMuscleGroups(info, ExerciseInfoMuscleRole.SYNERGIST);
        }

        secondary = filterMuscles(secondary, primary);
        synergist = filterMuscles(synergist, primary, secondary);

        return new HeatmapResolution(
                definition.getId(),
                mappingSource,
                exerciseInfoId,
                resolvedExerciseName,
                primary,
                List.copyOf(secondary),
                List.copyOf(synergist)
        );
    }

    private List<MuscleGroupId> filterMuscles(List<MuscleGroupId> muscles, MuscleGroupId primary) {
        return muscles.stream()
                .filter(Objects::nonNull)
                .filter(muscle -> muscle != primary)
                .distinct()
                .toList();
    }

    private List<MuscleGroupId> filterMuscles(List<MuscleGroupId> muscles, MuscleGroupId primary, List<MuscleGroupId> secondary) {
        Set<MuscleGroupId> excluded = new LinkedHashSet<>(secondary);
        if (primary != null) {
            excluded.add(primary);
        }
        return muscles.stream()
                .filter(Objects::nonNull)
                .filter(muscle -> !excluded.contains(muscle))
                .distinct()
                .toList();
    }

    private ExerciseInfo requireExerciseInfo(Long exerciseInfoId) {
        return exerciseInfoRepository.findById(exerciseInfoId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise info not found"));
    }

    private Optional<ExerciseDefinition> findByIdentity(UUID userId, String exerciseName, String variant) {
        return exerciseDefinitionRepository.findByUserIdAndNormalizedExerciseNameAndNormalizedVariant(
                userId,
                normalize(exerciseName),
                normalize(variant)
        );
    }

    private List<ExerciseDefinition> findDefinitionsByExerciseInfo(UUID userId, Long exerciseInfoId) {
        if (exerciseInfoId == null) {
            return List.of();
        }
        return exerciseDefinitionRepository.findAllByUserIdAndExerciseInfo_Id(userId, exerciseInfoId);
    }

    private List<ExerciseDefinition> findTypedSearchMatches(UUID userId, String query, String exerciseName, String variant) {
        String candidateName = firstNonBlank(exerciseName, query);
        String normalizedName = normalize(candidateName);
        String normalizedVariant = normalize(variant);
        if (normalizedName.isBlank()) {
            return List.of();
        }

        return exerciseDefinitionRepository.findByUserIdOrderByExerciseNameAscVariantAsc(userId).stream()
                .filter(definition -> matchesTypedSearch(definition, normalizedName, normalizedVariant))
                .toList();
    }

    private boolean matchesTypedSearch(ExerciseDefinition definition, String normalizedName, String normalizedVariant) {
        String definitionName = normalize(definition.getExerciseName());
        String definitionVariant = normalize(definition.getVariant());
        String combinedDefinition = joinNormalized(definitionName, definitionVariant);
        String combinedQuery = joinNormalized(normalizedName, normalizedVariant);

        if (!normalizedVariant.isBlank()) {
            return isCloseNormalizedMatch(definitionName, normalizedName)
                    && isCloseNormalizedMatch(definitionVariant, normalizedVariant);
        }

        if (isCloseNormalizedMatch(definitionName, normalizedName)) {
            return true;
        }

        return !combinedDefinition.isBlank()
                && !combinedQuery.isBlank()
                && isCloseNormalizedMatch(combinedDefinition, combinedQuery);
    }

    private List<ExerciseDefinitionResolveMatchDTO> buildRankedResolveMatches(UUID userId, List<ExerciseDefinition> definitions) {
        return rankDefinitionsByUsage(userId, definitions).stream()
                .map(definition -> toResolveMatchDto(definition, loadUsageByDefinitionId(userId, List.of(definition.getId())).get(definition.getId())))
                .toList();
    }

    private List<ExerciseDefinition> rankDefinitionsByUsage(UUID userId, List<ExerciseDefinition> definitions) {
        Map<UUID, ExerciseDefinitionUsageSummaryRow> usageByDefinitionId = loadUsageByDefinitionId(
                userId,
                definitions.stream().map(ExerciseDefinition::getId).filter(Objects::nonNull).toList()
        );

        return definitions.stream()
                .sorted((left, right) -> {
                    ExerciseDefinitionUsageSummaryRow leftUsage = usageByDefinitionId.get(left.getId());
                    ExerciseDefinitionUsageSummaryRow rightUsage = usageByDefinitionId.get(right.getId());
                    long leftSessionCount = leftUsage == null ? 0 : leftUsage.sessionCount();
                    long rightSessionCount = rightUsage == null ? 0 : rightUsage.sessionCount();
                    if (leftSessionCount != rightSessionCount) {
                        return Long.compare(rightSessionCount, leftSessionCount);
                    }

                    Instant leftLastUsed = leftUsage == null ? null : leftUsage.lastUsedAt();
                    Instant rightLastUsed = rightUsage == null ? null : rightUsage.lastUsedAt();
                    if (!Objects.equals(leftLastUsed, rightLastUsed)) {
                        if (leftLastUsed == null) {
                            return 1;
                        }
                        if (rightLastUsed == null) {
                            return -1;
                        }
                        return rightLastUsed.compareTo(leftLastUsed);
                    }

                    Instant leftCreatedAt = left.getCreatedAt();
                    Instant rightCreatedAt = right.getCreatedAt();
                    if (!Objects.equals(leftCreatedAt, rightCreatedAt)) {
                        if (leftCreatedAt == null) {
                            return 1;
                        }
                        if (rightCreatedAt == null) {
                            return -1;
                        }
                        return leftCreatedAt.compareTo(rightCreatedAt);
                    }

                    return String.valueOf(left.getId()).compareTo(String.valueOf(right.getId()));
                })
                .toList();
    }

    private Map<UUID, ExerciseDefinitionUsageSummaryRow> loadUsageByDefinitionId(UUID userId, List<UUID> definitionIds) {
        if (definitionIds == null || definitionIds.isEmpty()) {
            return Map.of();
        }

        return exerciseEntryRepository.summarizeUsageByDefinitionIds(userId, definitionIds).stream()
                .collect(Collectors.toMap(
                        ExerciseDefinitionUsageSummaryRow::definitionId,
                        row -> row,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private ExerciseDefinitionResolveMatchDTO toResolveMatchDto(
            ExerciseDefinition definition,
            ExerciseDefinitionUsageSummaryRow usage
    ) {
        return new ExerciseDefinitionResolveMatchDTO(
                definition.getId(),
                definition.getExerciseName(),
                definition.getVariant(),
                definition.getExerciseInfo() == null ? null : definition.getExerciseInfo().getId(),
                definition.getMappingSource(),
                definition.getPrimaryMuscle(),
                definition.getSecondaryMuscles(),
                definition.getCreatedAt(),
                definition.getUpdatedAt(),
                usage == null ? 0 : usage.sessionCount(),
                usage == null ? null : usage.lastUsedAt()
        );
    }

    private ExerciseDefinition findOrCreateByIdentity(
            UUID userId,
            String exerciseName,
            String variant,
            Long exerciseInfoId
    ) {
        ExerciseInfo exerciseInfo = exerciseInfoId == null ? null : requireExerciseInfo(exerciseInfoId);
        String canonicalName = exerciseInfo != null ? exerciseInfo.getName() : safeName(exerciseName);
        String canonicalVariant = exerciseInfo != null ? emptyToNull(exerciseInfo.getVariation()) : emptyToNull(variant);

        if (canonicalName.isBlank()) {
            throw new BadRequestException("Exercise name is required");
        }

        Optional<ExerciseDefinition> existing = findByIdentity(userId, canonicalName, canonicalVariant);
        if (existing.isPresent()) {
            ExerciseDefinition found = existing.get();
            if (found.getExerciseInfo() == null && exerciseInfo != null) {
                found.setExerciseInfo(exerciseInfo);
                found.setMappingSource(MappingSource.CATALOG);
                found.setExerciseName(exerciseInfo.getName());
                found.setVariant(emptyToNull(exerciseInfo.getVariation()));
                found.setNormalizedExerciseName(normalize(found.getExerciseName()));
                found.setNormalizedVariant(normalize(found.getVariant()));
                return exerciseDefinitionRepository.save(found);
            }
            return found;
        }

        ExerciseDefinition created = new ExerciseDefinition();
        created.setUserId(userId);
        created.setExerciseName(canonicalName);
        created.setVariant(canonicalVariant);
        created.setNormalizedExerciseName(normalize(canonicalName));
        created.setNormalizedVariant(normalize(canonicalVariant));
        created.setExerciseInfo(exerciseInfo);
        created.setMappingSource(exerciseInfo == null ? MappingSource.AUTO : MappingSource.CATALOG);
        created.setSecondaryMuscles(new LinkedHashSet<>());
        return exerciseDefinitionRepository.save(created);
    }

    private List<MuscleGroupId> safeSet(List<MuscleGroupId> secondaryMuscles) {
        return secondaryMuscles == null ? List.of() : secondaryMuscles.stream().filter(Objects::nonNull).toList();
    }

    private String safeName(String value) {
        return value == null ? "" : value.trim();
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalize(String value) {
        return value == null ? "" : normalizeIdentity(value);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private String joinNormalized(String left, String right) {
        if (left == null || left.isBlank()) {
            return right == null ? "" : right;
        }
        if (right == null || right.isBlank()) {
            return left;
        }
        return left + "_" + right;
    }

    private boolean isCloseNormalizedMatch(String left, String right) {
        if (Objects.equals(left, right)) {
            return true;
        }

        String compactLeft = compactNormalizedValue(left);
        String compactRight = compactNormalizedValue(right);
        if (Objects.equals(compactLeft, compactRight)) {
            return true;
        }

        return isOneEditOrLess(compactLeft, compactRight);
    }

    private String compactNormalizedValue(String value) {
        return value == null ? "" : value.replace("_", "");
    }

    private boolean isOneEditOrLess(String left, String right) {
        if (Objects.equals(left, right)) {
            return true;
        }
        if (Math.abs(left.length() - right.length()) > 1) {
            return false;
        }

        String shorter = left.length() <= right.length() ? left : right;
        String longer = left.length() <= right.length() ? right : left;
        int shortIndex = 0;
        int longIndex = 0;
        int edits = 0;

        while (shortIndex < shorter.length() && longIndex < longer.length()) {
            if (shorter.charAt(shortIndex) == longer.charAt(longIndex)) {
                shortIndex++;
                longIndex++;
                continue;
            }

            edits++;
            if (edits > 1) {
                return false;
            }

            if (shorter.length() == longer.length()) {
                shortIndex++;
            }
            longIndex++;
        }

        if (shortIndex < shorter.length() || longIndex < longer.length()) {
            edits++;
        }

        return edits <= 1;
    }

    private static Map<String, MuscleGroupId> buildMuscleLookup() {
        return Arrays.stream(MuscleGroupId.values())
                .collect(Collectors.toMap(
                        value -> normalizeIdentity(value.name()),
                        value -> value,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private static Map<String, MuscleGroupId> buildMuscleSynonyms() {
        Map<String, MuscleGroupId> synonyms = new LinkedHashMap<>();
        registerSynonym(synonyms, MuscleGroupId.chest, "chest", "pectoralis_major", "pectoralis_major_sternal", "pectoralis_major_clavicular", "pec_major");
        registerSynonym(synonyms, MuscleGroupId.front_delt, "front_delt", "front_deltoid", "anterior_delt", "anterior_deltoid", "shoulder", "deltoid", "lateral_delt", "lateral_deltoid");
        registerSynonym(synonyms, MuscleGroupId.triceps, "triceps", "triceps_brachii");
        registerSynonym(synonyms, MuscleGroupId.serratus, "serratus", "serratus_anterior");
        registerSynonym(synonyms, MuscleGroupId.lats, "lats", "latissimus", "latissimus_dorsi", "back");
        registerSynonym(synonyms, MuscleGroupId.traps, "traps", "trapezius", "upper_trapezius", "middle_trapezius", "lower_trapezius", "levator_scapulae", "rhomboids", "infraspinatus", "teres_minor", "teres_major");
        registerSynonym(synonyms, MuscleGroupId.rear_delt, "rear_delt", "rear_deltoid", "posterior_deltoid", "posterior_delt");
        registerSynonym(synonyms, MuscleGroupId.biceps, "biceps", "biceps_brachii", "brachialis");
        registerSynonym(synonyms, MuscleGroupId.forearms, "forearms", "brachioradialis", "wrist_flexors", "wrist_extensors");
        registerSynonym(synonyms, MuscleGroupId.lower_back, "lower_back", "erector_spinae", "spinal_erectors");
        registerSynonym(synonyms, MuscleGroupId.quads, "quads", "quadriceps", "adductor_magnus");
        registerSynonym(synonyms, MuscleGroupId.hamstrings, "hamstrings", "hamstring");
        registerSynonym(synonyms, MuscleGroupId.glutes, "glutes", "gluteus_maximus");
        registerSynonym(synonyms, MuscleGroupId.adductors, "adductors");
        registerSynonym(synonyms, MuscleGroupId.calves, "calves", "gastrocnemius", "soleus");
        registerSynonym(synonyms, MuscleGroupId.tibialis, "tibialis", "tibialis_anterior");
        registerSynonym(synonyms, MuscleGroupId.abs, "abs", "abdominals", "rectus_abdominis", "core");
        registerSynonym(synonyms, MuscleGroupId.obliques, "obliques", "oblique");
        return synonyms;
    }

    private static void registerSynonym(Map<String, MuscleGroupId> synonyms, MuscleGroupId muscle, String... aliases) {
        for (String alias : aliases) {
            synonyms.putIfAbsent(alias, muscle);
        }
    }

    private static String normalizeIdentity(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
    }

    private Optional<MuscleGroupId> parseMuscle(String value) {
        String normalized = normalizeIdentity(value);
        if (normalized.isBlank()) {
            return Optional.empty();
        }
        MuscleGroupId direct = MUSCLE_LOOKUP.get(normalized);
        if (direct != null) {
            return Optional.of(direct);
        }
        return Optional.ofNullable(MUSCLE_SYNONYMS.get(normalized));
    }

    private List<MuscleGroupId> parseMuscleGroups(ExerciseInfo info, ExerciseInfoMuscleRole... roles) {
        if (info.getMuscles() == null || info.getMuscles().isEmpty()) {
            return List.of();
        }
        return info.getMuscles().stream()
                .filter(muscle -> muscle != null && muscle.getMuscleRole() != null && muscle.getMuscleGroup() != null)
                .filter(muscle -> Arrays.asList(roles).contains(muscle.getMuscleRole()))
                .map(ExerciseInfoMuscle::getMuscleGroup)
                .map(this::nameOf)
                .map(this::parseMuscle)
                .flatMap(Optional::stream)
                .distinct()
                .toList();
    }

    private String nameOf(com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup muscleGroup) {
        return muscleGroup == null ? null : muscleGroup.getName();
    }

    private Map<String, Double> normalise(Map<MuscleGroupId, Double> rawScores) {
        if (rawScores.isEmpty()) {
            return Map.of();
        }
        double max = rawScores.values().stream().mapToDouble(Double::doubleValue).max().orElse(1.0);
        return rawScores.entrySet().stream()
                .collect(Collectors.toMap(
                        entry -> entry.getKey().name(),
                        entry -> Math.min(1.0, round(entry.getValue() / max)),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private static double round(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }

    private record ExerciseIdentityKey(String exerciseName, String variant) {
        static ExerciseIdentityKey from(String exerciseName, String variant) {
            return new ExerciseIdentityKey(normalizeIdentity(exerciseName), normalizeIdentity(variant));
        }
    }

    private record ScopeExercise(
            String displayExerciseName,
            String displayVariant,
            ExerciseDefinition definition
    ) {}

    private record ExerciseHistorySessionSlice(
            LocalDate date,
            Instant performedAt,
            UUID workoutEntryId,
            UUID workoutTemplateId,
            ExerciseHistoryBlockContextDTO blockContext,
            ExerciseEntry exerciseEntry
    ) {}

    private record HeatmapResolution(
            UUID mappingId,
            MappingSource mappingSource,
            Long exerciseInfoId,
            String resolvedExerciseName,
            MuscleGroupId primaryMuscle,
            List<MuscleGroupId> secondaryMuscles,
            List<MuscleGroupId> synergistMuscles
    ) {
        boolean isResolved() {
            return primaryMuscle != null;
        }

        ResolvedExerciseHeatmapDTO toDto(String exerciseName, String variant) {
            return new ResolvedExerciseHeatmapDTO(
                    mappingId,
                    exerciseName,
                    variant,
                    mappingSource,
                    exerciseInfoId,
                    resolvedExerciseName,
                    primaryMuscle,
                    secondaryMuscles,
                    synergistMuscles
            );
        }
    }

    @Transactional(readOnly = true)
    public List<ExerciseDefinitionDTO> listDuplicates(UUID userId) {
        return exerciseDefinitionRepository.findDuplicatesByUserId(userId)
                .stream()
                .map(ExerciseDefinition::toDTO)
                .toList();
    }
}
