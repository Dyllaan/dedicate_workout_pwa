package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dto.responses.heatmap.ExerciseInfoCatalogItemDTO;
import org.springframework.stereotype.Component;

@Component
public class ExerciseInfoMapper {

    public ExerciseInfoCatalogItemDTO toDTO(ExerciseInfo entity) {
        return new ExerciseInfoCatalogItemDTO(
                entity.getId(),
                entity.getName(),
                entity.getVariation(),
                lookupName(entity.getEquipmentLookup()),
                lookupName(entity.getMainMuscleLookup())
        );
    }

    private static String lookupName(Object lookup) {
        if (lookup instanceof ExerciseCatalogEquipment equipment) {
            return equipment.getName();
        }
        if (lookup instanceof ExerciseCatalogMuscleGroup muscleGroup) {
            return muscleGroup.getName();
        }
        return null;
    }
}
