package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dto.ExerciseConfigDTO;
import com.louisfiges.workout.dto.request.ExerciseConfigGoalRepsRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigGoalSetsRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigPrimaryBenchmarkRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigProgressionModeRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigTargetRestSecondsRequest;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.ExerciseConfigRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import com.louisfiges.workout.validation.RestTimeValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ExerciseConfigService {

    private final ExerciseConfigRepository repository;
    private final AnalysisCacheEvictor analysisCacheEvictor;

    public ExerciseConfigService(ExerciseConfigRepository repository, AnalysisCacheEvictor analysisCacheEvictor) {
        this.repository = repository;
        this.analysisCacheEvictor = analysisCacheEvictor;
    }

    @Transactional(readOnly = true)
    public ExerciseConfigDTO getById(UUID exerciseConfigId, UUID userId) {
        return getRequired(exerciseConfigId, userId).toDTO();
    }

    public ExerciseConfigDTO setGoalSets(
            UUID exerciseConfigId,
            UUID userId,
            ExerciseConfigGoalSetsRequest request
    ) {
        ExerciseConfig config = getRequired(exerciseConfigId, userId);
        Integer goalSets = request.goalSets();
        if (goalSets == null || goalSets < 1) {
            throw new BadRequestException("Goal sets must be at least 1");
        }
        config.setGoalSets(goalSets);
        ExerciseConfigDTO response = repository.save(config).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public ExerciseConfigDTO setGoalReps(
            UUID exerciseConfigId,
            UUID userId,
            ExerciseConfigGoalRepsRequest request
    ) {
        ExerciseConfig config = getRequired(exerciseConfigId, userId);
        Integer goalReps = request.goalReps();
        if (goalReps != null && goalReps < 1) {
            throw new BadRequestException("Goal reps must be at least 1");
        }
        config.setGoalReps(goalReps);
        ExerciseConfigDTO response = repository.save(config).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public ExerciseConfigDTO setProgressionMode(
            UUID exerciseConfigId,
            UUID userId,
            ExerciseConfigProgressionModeRequest request
    ) {
        ExerciseConfig config = getRequired(exerciseConfigId, userId);
        ProgressionMode progressionMode = requireValue(
                request.progressionMode(),
                "Progression mode is required"
        );
        config.setProgressionMode(progressionMode);
        ExerciseConfigDTO response = repository.save(config).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public ExerciseConfigDTO setPrimaryBenchmark(
            UUID exerciseConfigId,
            UUID userId,
            ExerciseConfigPrimaryBenchmarkRequest request
    ) {
        ExerciseConfig config = getRequired(exerciseConfigId, userId);
        PrimaryBenchmark primaryBenchmark = requireValue(
                request.primaryBenchmark(),
                "Primary benchmark is required"
        );
        config.setPrimaryBenchmark(primaryBenchmark);
        ExerciseConfigDTO response = repository.save(config).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public ExerciseConfigDTO setTargetRestSeconds(
            UUID exerciseConfigId,
            UUID userId,
            ExerciseConfigTargetRestSecondsRequest request
    ) {
        ExerciseConfig config = getRequired(exerciseConfigId, userId);
        config.setTargetRestSeconds(RestTimeValidator.validateOptional(request.targetRestSeconds()));
        ExerciseConfigDTO response = repository.save(config).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public ExerciseConfigDTO toggleFocus(UUID exerciseConfigId, UUID userId) {
        ExerciseConfig target = getRequired(exerciseConfigId, userId);
        List<ExerciseConfig> configs = repository.findAllByWorkoutTemplateIdAndWorkoutTemplateUserId(
                target.getWorkoutTemplate().getId(),
                userId
        );

        boolean nextFocus = !Boolean.TRUE.equals(target.getFocus());
        for (ExerciseConfig config : configs) {
            if (exerciseConfigId.equals(config.getExerciseConfigId())) {
                config.setFocus(nextFocus);
            } else if (nextFocus) {
                config.setFocus(false);
            }
        }

        repository.saveAll(configs);
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return target.toDTO();
    }

    private ExerciseConfig getRequired(UUID exerciseConfigId, UUID userId) {
        return repository.findByExerciseConfigIdAndWorkoutTemplateUserId(exerciseConfigId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise config not found"));
    }

    private static <T> T requireValue(T value, String message) {
        if (value == null) {
            throw new BadRequestException(message);
        }
        return value;
    }
}
