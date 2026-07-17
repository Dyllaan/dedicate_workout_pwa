package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscle;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscleRole;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.heatmap.MuscleHeatmapResponseDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.heatmap.MuscleGroupId;
import com.louisfiges.workout.repository.ExerciseDefinitionRepository;
import com.louisfiges.workout.repository.ExerciseConfigRepository;
import com.louisfiges.workout.repository.ExerciseEntryRepository;
import com.louisfiges.workout.repository.ExerciseInfoRepository;
import com.louisfiges.workout.repository.ProgrammeRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import com.louisfiges.workout.service.mapper.ExerciseDefinitionMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@DisplayName("ExerciseDefinitionService heatmap fallback")
class ExerciseDefinitionServiceHeatmapFallbackTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000123");

    @Test
    @DisplayName("uses target muscle rows when the main muscle label is not heatmap-friendly")
    void usesTargetMusclesWhenMainLabelDoesNotParse() {
        ExerciseDefinitionRepository exerciseDefinitionRepository = mock(ExerciseDefinitionRepository.class);
        ExerciseConfigRepository exerciseConfigRepository = mock(ExerciseConfigRepository.class);
        ExerciseEntryRepository exerciseEntryRepository = mock(ExerciseEntryRepository.class);
        ExerciseInfoRepository exerciseInfoRepository = mock(ExerciseInfoRepository.class);
        WorkoutTemplateRepository workoutTemplateRepository = mock(WorkoutTemplateRepository.class);
        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);
        ProgrammeRepository programmeRepository = mock(ProgrammeRepository.class);
        AnalysisCacheEvictor analysisCacheEvictor = mock(AnalysisCacheEvictor.class);

        ExerciseInfo info = new ExerciseInfo();
        ReflectionTestUtils.setField(info, "id", 10L);
        info.setName("Low Row");
        info.setVariation("Cable");
        info.setMainMuscle(new com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup("Back"));
        info.setMuscles(new LinkedHashSet<>(List.of(
                new ExerciseInfoMuscle(info, ExerciseInfoMuscleRole.TARGET, new com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup("Latissimus Dorsi")),
                new ExerciseInfoMuscle(info, ExerciseInfoMuscleRole.SECONDARY, new com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup("Trapezius"))
        )));

        ExerciseDefinition definition = new ExerciseDefinition();
        ReflectionTestUtils.setField(definition, "id", UUID.fromString("00000000-0000-0000-0000-000000000234"));
        definition.setUserId(USER_ID);
        definition.setExerciseName("Low Row");
        definition.setVariant("Cable");
        definition.setNormalizedExerciseName("low row");
        definition.setNormalizedVariant("cable");
        definition.setMappingSource(MappingSource.CATALOG);
        definition.setExerciseInfo(info);

        ExerciseConfig config = new ExerciseConfig();
        config.setExerciseDefinition(definition);
        config.setGoalSets(4);

        WorkoutTemplate template = new WorkoutTemplate("Pull", USER_ID, "Pull", List.of(config));
        ReflectionTestUtils.setField(template, "id", UUID.fromString("00000000-0000-0000-0000-000000000345"));

        ExerciseEntry exerciseEntry = new ExerciseEntry(
                definition,
                "Low Row",
                "Cable",
                4,
                List.of(new SetEntry(8, 80.0, 8.0, null))
        );

        WorkoutEntry workoutEntry = new WorkoutEntry(template, USER_ID, List.of(exerciseEntry), null);

        when(workoutTemplateRepository.findByIdAndUserId(eq(template.getId()), eq(USER_ID)))
                .thenReturn(Optional.of(template));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(template.getId()), eq(USER_ID)))
                .thenReturn(List.of(workoutEntry));

        ExerciseDefinitionMapper exerciseDefinitionMapper = mock(ExerciseDefinitionMapper.class);

        ExerciseDefinitionService service = new ExerciseDefinitionService(
                exerciseDefinitionRepository,
                exerciseConfigRepository,
                exerciseEntryRepository,
                exerciseInfoRepository,
                workoutTemplateRepository,
                workoutEntryRepository,
                programmeRepository,
                analysisCacheEvictor,
                exerciseDefinitionMapper
        );

        MuscleHeatmapResponseDTO response = service.getTemplateHeatmap(USER_ID, template.getId());

        assertThat(response.coverage().mappedExercises()).isEqualTo(1);
        assertThat(response.resolvedExercises()).hasSize(1);
        assertThat(response.resolvedExercises().get(0).primaryMuscle()).isEqualTo(MuscleGroupId.lats);
        assertThat(response.resolvedExercises().get(0).secondaryMuscles())
                .contains(MuscleGroupId.traps);
    }
}
