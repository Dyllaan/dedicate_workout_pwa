package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.settings.WorkoutUserSettings;
import com.louisfiges.workout.dto.responses.WorkoutUserSettingsDTO;
import org.springframework.stereotype.Component;

@Component
public class WorkoutUserSettingsMapper {

    public WorkoutUserSettingsDTO toDTO(WorkoutUserSettings entity) {
        return new WorkoutUserSettingsDTO(entity.getDefaultRestSeconds());
    }
}
