package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.ExerciseCatalogDifficulty;
import com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment;
import com.louisfiges.workout.dao.workout.ExerciseCatalogForce;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMechanics;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup;
import com.louisfiges.workout.dao.workout.ExerciseCatalogUtility;
import org.springframework.stereotype.Component;

@Component
public class ExerciseCatalogMapper {

    public String toEquipmentName(ExerciseCatalogEquipment equipment) {
        return equipment != null ? equipment.getName() : null;
    }

    public String toMuscleGroupName(ExerciseCatalogMuscleGroup muscleGroup) {
        return muscleGroup != null ? muscleGroup.getName() : null;
    }

    public String toUtilityName(ExerciseCatalogUtility utility) {
        return utility != null ? utility.getName() : null;
    }

    public String toMechanicsName(ExerciseCatalogMechanics mechanics) {
        return mechanics != null ? mechanics.getName() : null;
    }

    public String toForceName(ExerciseCatalogForce force) {
        return force != null ? force.getName() : null;
    }

    public Integer toDifficultyLevel(ExerciseCatalogDifficulty difficulty) {
        return difficulty != null ? difficulty.getLevel() : null;
    }
}
