package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.request.insights.ReadinessCheckInRequestDTO;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.WorkoutEntryDTO;
import com.louisfiges.workout.dto.request.ExerciseEntryRequest;
import com.louisfiges.workout.dto.request.WorkoutEntryRequest;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import com.louisfiges.workout.validation.RestTimeValidator;
import com.louisfiges.workout.util.PaginationUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WorkoutEntryService {

    private final WorkoutEntryRepository workoutEntryRepository;
    private final WorkoutTemplateRepository workoutTemplateRepository;
    private final ExerciseDefinitionService exerciseDefinitionService;
    private final ReadinessService readinessService;
    private final AnalysisCacheEvictor analysisCacheEvictor;

    public WorkoutEntryService(
            WorkoutEntryRepository workoutEntryRepository,
            WorkoutTemplateRepository workoutTemplateRepository,
            ExerciseDefinitionService exerciseDefinitionService,
            ReadinessService readinessService,
            AnalysisCacheEvictor analysisCacheEvictor) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.workoutTemplateRepository = workoutTemplateRepository;
        this.exerciseDefinitionService = exerciseDefinitionService;
        this.readinessService = readinessService;
        this.analysisCacheEvictor = analysisCacheEvictor;
    }

    @Transactional(readOnly = true)
    public List<WorkoutEntryDTO> getAllByUser(UUID userId) {
        return getAllByUser(userId, null);
    }

    @Transactional(readOnly = true)
    public List<WorkoutEntryDTO> getAllByUser(UUID userId, UUID workoutTemplateId) {
        if (workoutTemplateId != null) {
            return workoutEntryRepository.findHistoryByTemplateIdAndUserId(workoutTemplateId, userId)
                    .stream().map(WorkoutEntry::toDTO).toList();
        }
        return workoutEntryRepository.findHistoryByUserId(userId)
                .stream().map(WorkoutEntry::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<WorkoutEntryDTO> getAllByUser(UUID userId, UUID workoutTemplateId, int page, int size) {
        var pageable = PaginationUtils.toPageable(page, size);
        if (workoutTemplateId != null) {
            return PagedResponse.from(
                    workoutEntryRepository.findDetailedHistoryPageByTemplateIdAndUserId(
                            workoutTemplateId, userId, pageable
                    ).map(WorkoutEntry::toDTO)
            );
        }
        return PagedResponse.from(
                workoutEntryRepository.findDetailedHistoryPageByUserId(
                        userId, pageable
                ).map(WorkoutEntry::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public List<WorkoutEntryDTO> getByDateRange(UUID userId, LocalDate startDate, LocalDate endDate) {
        Instant start = startDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = endDate.plusDays(1L).atStartOfDay().minusNanos(1L).toInstant(ZoneOffset.UTC);
        return workoutEntryRepository.findHistoryByUserIdAndCreatedAtBetween(userId, start, end)
                .stream().map(WorkoutEntry::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<WorkoutEntryDTO> getByDateRange(UUID userId, LocalDate startDate, LocalDate endDate, int page, int size) {
        Instant start = startDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = endDate.plusDays(1L).atStartOfDay().minusNanos(1L).toInstant(ZoneOffset.UTC);
        return PagedResponse.from(
                workoutEntryRepository.findDetailedHistoryPageByUserIdAndCreatedAtBetween(
                        userId, start, end, PaginationUtils.toPageable(page, size)
                ).map(WorkoutEntry::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public WorkoutEntryDTO getById(UUID id, UUID userId) {
        return workoutEntryRepository.findDetailedByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout entry not found"))
                .toDTO();
    }

    @Transactional
    public WorkoutEntryDTO create(WorkoutEntryRequest request, UUID userId) {
        WorkoutTemplate template = workoutTemplateRepository.findByIdAndUserId(request.workoutTemplateId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout template not found"));
        WorkoutEntry saved = workoutEntryRepository.save(
                new WorkoutEntry(template, userId, buildExerciseEntries(request.exercises(), userId), request.notes())
        );
        if (request.readiness() != null && readinessService != null) {
            readinessService.createCheckIn(userId, saved.getId(), request.readiness());
        }
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return saved.toDTO();
    }

    @Transactional
    public WorkoutEntryDTO update(UUID id, WorkoutEntryRequest request, UUID userId) {
        WorkoutEntry entry = workoutEntryRepository.findDetailedByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout entry not found"));
        entry.getExercises().clear();
        workoutEntryRepository.flush();
        entry.getExercises().addAll(buildExerciseEntries(request.exercises(), userId));
        entry.setNotes(request.notes());
        WorkoutEntryDTO response = workoutEntryRepository.save(entry).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        WorkoutEntry entry = workoutEntryRepository.findDetailedByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout entry not found"));
        workoutEntryRepository.delete(entry);
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
    }

    @Transactional(readOnly = true)
    public List<WorkoutEntryDTO> getRecentEntries(UUID userId, int limit) {
        return workoutEntryRepository.findHistoryByUserId(userId, PageRequest.of(0, Math.max(1, limit)))
                .stream().map(WorkoutEntry::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<WorkoutEntryDTO> getRecentEntries(UUID userId, int page, int size) {
        return PagedResponse.from(
                workoutEntryRepository.findHistoryPageByUserId(userId, PaginationUtils.toPageable(page, size))
                        .map(WorkoutEntry::toDTO)
        );
    }

    private List<ExerciseEntry> buildExerciseEntries(List<ExerciseEntryRequest> exercises, UUID userId) {
        return exercises.stream()
                .map(exercise -> {
                    ExerciseDefinition definition = exerciseDefinitionService.resolveForUser(
                            userId,
                            exercise.exerciseDefinitionId(),
                            exercise.exerciseName(),
                            exercise.variant(),
                            exercise.exerciseInfoId()
                    );
                    List<SetEntry> sets = exercise.sets().stream()
                            .map(set -> new SetEntry(
                                    set.reps(), set.weight(), set.rpe(), set.notes(),
                                    set.setRole(), RestTimeValidator.validateOptional(set.restBeforeSeconds())
                            ))
                            .toList();
                    return new ExerciseEntry(definition, exercise.exerciseName(), exercise.variant(),
                            exercise.goalSets(), sets);
                })
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
