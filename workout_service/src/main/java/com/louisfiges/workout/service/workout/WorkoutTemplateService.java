package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.WorkoutTemplateDTO;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.request.WorkoutTemplateRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigRequest;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import com.louisfiges.workout.validation.RestTimeValidator;
import com.louisfiges.workout.util.PaginationUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

@Service
public class WorkoutTemplateService {

    private final WorkoutTemplateRepository workoutTemplateRepository;
    private final ExerciseDefinitionService exerciseDefinitionService;
    private final AnalysisCacheEvictor analysisCacheEvictor;

    @Autowired
    public WorkoutTemplateService(
            WorkoutTemplateRepository workoutTemplateRepository,
            ExerciseDefinitionService exerciseDefinitionService,
            AnalysisCacheEvictor analysisCacheEvictor
    ) {
        this.workoutTemplateRepository = workoutTemplateRepository;
        this.exerciseDefinitionService = exerciseDefinitionService;
        this.analysisCacheEvictor = analysisCacheEvictor;
    }

    @Transactional(readOnly = true)
    public List<WorkoutTemplateDTO> getAllByUser(UUID userId) {
        return workoutTemplateRepository.findByUserId(userId)
                .stream()
                .map(WorkoutTemplate::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<WorkoutTemplateDTO> getAllByUser(UUID userId, int page, int size) {
        return PagedResponse.from(
                workoutTemplateRepository.findByUserId(userId, PaginationUtils.toPageable(page, size))
                        .map(WorkoutTemplate::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public List<WorkoutTemplateDTO> getByCategory(UUID userId, String category) {
        return workoutTemplateRepository.findByUserIdAndCategory(userId, category)
                .stream()
                .map(WorkoutTemplate::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<WorkoutTemplateDTO> getByCategory(UUID userId, String category, int page, int size) {
        return PagedResponse.from(
                workoutTemplateRepository.findByUserIdAndCategory(userId, category, PaginationUtils.toPageable(page, size))
                        .map(WorkoutTemplate::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public WorkoutTemplateDTO getById(UUID id, UUID userId) {
        return workoutTemplateRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout template not found"))
                .toDTO();
    }

    @Transactional
    public WorkoutTemplateDTO create(WorkoutTemplateRequest request, UUID userId) {
        validateTemplateFocus(request.exercises());
        WorkoutTemplate saved = workoutTemplateRepository.save(
                new WorkoutTemplate(
                        request.name(),
                        userId,
                        request.category(),
                        toExerciseConfigs(userId, request.exercises())
                )
        );
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return saved.toDTO();
    }

    @Transactional
    public WorkoutTemplateDTO update(UUID id, WorkoutTemplateRequest request, UUID userId) {
        WorkoutTemplate template = workoutTemplateRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout template not found"));

        validateTemplateFocus(request.exercises());
        template.setName(request.name());
        template.setCategory(request.category());
        template.getExercises().clear();
        workoutTemplateRepository.flush();
        template.replaceExercises(toExerciseConfigs(userId, request.exercises()));

        WorkoutTemplateDTO response = workoutTemplateRepository.save(template).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        WorkoutTemplate template = workoutTemplateRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout template not found"));
        workoutTemplateRepository.delete(template);
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
    }

    @Transactional(readOnly = true)
    public List<String> getAllCategories(UUID userId) {
        return workoutTemplateRepository.findDistinctCategoriesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<String> getAllExerciseNames(UUID userId) {
        return workoutTemplateRepository.findDistinctExerciseNamesByUserId(userId);
    }

    public List<WorkoutTemplate> findAllByIdsAndUserId(List<UUID> ids, UUID userId) {
        List<WorkoutTemplate> templates = workoutTemplateRepository.findAllByIdAndUserId(ids, userId);
        if (templates.size() != ids.size()) {
            throw new ResourceNotFoundException("Some workout templates not found");
        }
        return templates;
    }

    private List<ExerciseConfig> toExerciseConfigs(UUID userId, List<ExerciseConfigRequest> requests) {
        return IntStream.range(0, requests.size())
                .mapToObj(index -> toExerciseConfig(userId, index, requests.get(index)))
                .toList();
    }

    private ExerciseConfig toExerciseConfig(UUID userId, int exerciseOrder, ExerciseConfigRequest request) {
        ExerciseDefinition definition = exerciseDefinitionService.resolveForUser(
                userId,
                request.exerciseDefinitionId(),
                request.exerciseName(),
                request.variant(),
                request.exerciseInfoId()
        );
        ExerciseConfig config = new ExerciseConfig(
                definition,
                request.goalSets(),
                request.goalReps(),
                request.progressionMode() == null ? ProgressionMode.WEIGHT_FIRST : request.progressionMode(),
                request.primaryBenchmark() == null ? PrimaryBenchmark.WORKING_SETS : request.primaryBenchmark(),
                RestTimeValidator.validateOptional(request.targetRestSeconds()),
                request.focus()
        );
        config.setExerciseOrder(exerciseOrder);
        if (request.exerciseConfigId() != null) {
            config.setExerciseConfigId(request.exerciseConfigId());
        }
        return config;
    }

    private void validateTemplateFocus(List<ExerciseConfigRequest> exercises) {
        long focusCount = exercises.stream()
                .filter(e -> Boolean.TRUE.equals(e.focus()))
                .count();
        if (focusCount > 1) {
            throw new BadRequestException("Only one exercise can be focused per workout template");
        }
    }
}
