package com.louisfiges.workout.service.core;

import com.louisfiges.workout.dao.settings.WorkoutUserSettings;
import com.louisfiges.workout.dto.request.WorkoutUserSettingsRequest;
import com.louisfiges.workout.dto.responses.WorkoutUserSettingsDTO;
import com.louisfiges.workout.repository.WorkoutUserSettingsRepository;
import com.louisfiges.workout.service.mapper.WorkoutUserSettingsMapper;
import com.louisfiges.workout.validation.RestTimeValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class WorkoutUserSettingsService {

    private final WorkoutUserSettingsRepository repository;
    private final WorkoutUserSettingsMapper workoutUserSettingsMapper;

    public WorkoutUserSettingsService(WorkoutUserSettingsRepository repository, WorkoutUserSettingsMapper workoutUserSettingsMapper) {
        this.repository = repository;
        this.workoutUserSettingsMapper = workoutUserSettingsMapper;
    }

    @Transactional(readOnly = true)
    public WorkoutUserSettingsDTO getForUser(UUID userId) {
        return repository.findById(userId)
                .map(workoutUserSettingsMapper::toDTO)
                .orElseGet(() -> new WorkoutUserSettingsDTO(RestTimeValidator.DEFAULT_REST_SECONDS));
    }

    @Transactional
    public WorkoutUserSettingsDTO updateForUser(UUID userId, WorkoutUserSettingsRequest request) {
        int defaultRestSeconds = RestTimeValidator.validate(request.defaultRestSeconds());
        WorkoutUserSettings settings = repository.findById(userId)
                .orElseGet(() -> new WorkoutUserSettings(userId, RestTimeValidator.DEFAULT_REST_SECONDS));

        settings.setDefaultRestSeconds(defaultRestSeconds);
        return workoutUserSettingsMapper.toDTO(repository.save(settings));
    }

}
