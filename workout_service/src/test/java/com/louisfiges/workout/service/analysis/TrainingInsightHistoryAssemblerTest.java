package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.heatmap.MuscleGroupId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TrainingInsightHistoryAssembler")
class TrainingInsightHistoryAssemblerTest {

    @Test
    @DisplayName("resolves lower body from exercise definition metadata")
    void resolvesLowerBodyFromPrimaryMuscle() {
        ExerciseDefinition definition = definition("Back Squat", null, MuscleGroupId.quads, null);
        ExerciseConfig config = new ExerciseConfig(definition, 3, 8, ProgressionMode.WEIGHT_FIRST, PrimaryBenchmark.WORKING_SETS, null, false);

        TrainingInsightHistoryAssembler assembler = new TrainingInsightHistoryAssembler(null, null);

        assertThat(assembler.resolveExerciseType(config)).isEqualTo(ExerciseType.LOWER_BODY);
    }

    @Test
    @DisplayName("falls back to template and exercise-info metadata without liftRole")
    void resolvesUpperBodyFromFallbackMetadata() {
        ExerciseDefinition definition = definition("Low Row", "Cable", null, "Back");
        ExerciseConfig config = new ExerciseConfig(definition, 3, 10, ProgressionMode.REPS_FIRST, PrimaryBenchmark.TOP_SET, null, false);

        TrainingInsightHistoryAssembler assembler = new TrainingInsightHistoryAssembler(null, null);

        assertThat(assembler.resolveExerciseType(config)).isEqualTo(ExerciseType.UPPER_BODY);
    }

    private ExerciseDefinition definition(String name, String variant, MuscleGroupId primaryMuscle, String mainMuscle) {
        ExerciseDefinition definition = new ExerciseDefinition();
        definition.setExerciseName(name);
        definition.setVariant(variant);
        definition.setNormalizedExerciseName(name.toLowerCase());
        definition.setNormalizedVariant(variant == null ? "" : variant.toLowerCase());
        definition.setPrimaryMuscle(primaryMuscle);
        definition.setMappingSource(MappingSource.AUTO);
        if (mainMuscle != null) {
            ExerciseInfo info = new ExerciseInfo();
            info.setMainMuscle(new ExerciseCatalogMuscleGroup(mainMuscle));
            definition.setExerciseInfo(info);
        }
        ReflectionTestUtils.setField(definition, "id", UUID.randomUUID());
        return definition;
    }
}
