package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dto.request.ExerciseDefinitionCollapseRequest;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionCollapseResponseDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.repository.ExerciseConfigRepository;
import com.louisfiges.workout.repository.ExerciseDefinitionRepository;
import com.louisfiges.workout.repository.ExerciseEntryRepository;
import com.louisfiges.workout.repository.ExerciseInfoRepository;
import com.louisfiges.workout.repository.ProgrammeRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import com.louisfiges.workout.service.mapper.ExerciseDefinitionMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("ExerciseDefinitionService collapse")
class ExerciseDefinitionServiceCollapseTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000123");

    @Test
    @DisplayName("moves linked configs and entries onto the canonical definition")
    void collapsesDefinitions() {
        ExerciseDefinitionRepository exerciseDefinitionRepository = mock(ExerciseDefinitionRepository.class);
        ExerciseConfigRepository exerciseConfigRepository = mock(ExerciseConfigRepository.class);
        ExerciseEntryRepository exerciseEntryRepository = mock(ExerciseEntryRepository.class);
        ExerciseInfoRepository exerciseInfoRepository = mock(ExerciseInfoRepository.class);
        WorkoutTemplateRepository workoutTemplateRepository = mock(WorkoutTemplateRepository.class);
        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);
        ProgrammeRepository programmeRepository = mock(ProgrammeRepository.class);
        AnalysisCacheEvictor analysisCacheEvictor = mock(AnalysisCacheEvictor.class);

        ExerciseDefinition canonical = buildDefinition(UUID.fromString("00000000-0000-0000-0000-000000000111"), "Low Row", null);
        ExerciseDefinition source = buildDefinition(UUID.fromString("00000000-0000-0000-0000-000000000222"), "Seated Rows (Others):  Seated Low Row", "Yes");

        ExerciseConfig sourceConfig = new ExerciseConfig();
        ReflectionTestUtils.setField(sourceConfig, "exerciseConfigId", UUID.fromString("00000000-0000-0000-0000-000000000333"));
        sourceConfig.setExerciseDefinition(source);

        ExerciseEntry sourceEntry = new ExerciseEntry();
        ReflectionTestUtils.setField(sourceEntry, "id", UUID.fromString("00000000-0000-0000-0000-000000000444"));
        sourceEntry.setExerciseDefinition(source);

        when(exerciseDefinitionRepository.findByIdAndUserId(eq(canonical.getId()), eq(USER_ID))).thenReturn(java.util.Optional.of(canonical));
        when(exerciseDefinitionRepository.findByUserIdAndIdIn(eq(USER_ID), anyCollection())).thenReturn(List.of(source));
        when(exerciseConfigRepository.findAllByExerciseDefinition_IdIn(anyCollection())).thenReturn(List.of(sourceConfig));
        when(exerciseEntryRepository.findAllByExerciseDefinition_IdIn(anyCollection())).thenReturn(List.of(sourceEntry));
        when(exerciseConfigRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0, List.class));
        when(exerciseEntryRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0, List.class));

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

        ExerciseDefinitionCollapseResponseDTO response = service.collapse(
                USER_ID,
                canonical.getId(),
                new ExerciseDefinitionCollapseRequest(List.of(source.getId()))
        );

        assertThat(response.canonicalDefinitionId()).isEqualTo(canonical.getId());
        assertThat(response.sourceDefinitionIds()).containsExactly(source.getId());
        assertThat(response.movedExerciseConfigs()).isEqualTo(1);
        assertThat(response.movedExerciseEntries()).isEqualTo(1);
        assertThat(sourceConfig.getExerciseDefinition()).isEqualTo(canonical);
        assertThat(sourceEntry.getExerciseDefinition()).isEqualTo(canonical);

        verify(exerciseDefinitionRepository).deleteAll(List.of(source));
    }

    @Test
    @DisplayName("rejects self-merge attempts")
    void rejectsSelfMerge() {
        ExerciseDefinitionRepository exerciseDefinitionRepository = mock(ExerciseDefinitionRepository.class);
        ExerciseConfigRepository exerciseConfigRepository = mock(ExerciseConfigRepository.class);
        ExerciseEntryRepository exerciseEntryRepository = mock(ExerciseEntryRepository.class);
        ExerciseInfoRepository exerciseInfoRepository = mock(ExerciseInfoRepository.class);
        WorkoutTemplateRepository workoutTemplateRepository = mock(WorkoutTemplateRepository.class);
        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);
        ProgrammeRepository programmeRepository = mock(ProgrammeRepository.class);
        AnalysisCacheEvictor analysisCacheEvictor = mock(AnalysisCacheEvictor.class);

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

        UUID definitionId = UUID.fromString("00000000-0000-0000-0000-000000000555");

        assertThatThrownBy(() -> service.collapse(USER_ID, definitionId, List.of(definitionId)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("rejects missing source definitions")
    void rejectsMissingSources() {
        ExerciseDefinitionRepository exerciseDefinitionRepository = mock(ExerciseDefinitionRepository.class);
        ExerciseConfigRepository exerciseConfigRepository = mock(ExerciseConfigRepository.class);
        ExerciseEntryRepository exerciseEntryRepository = mock(ExerciseEntryRepository.class);
        ExerciseInfoRepository exerciseInfoRepository = mock(ExerciseInfoRepository.class);
        WorkoutTemplateRepository workoutTemplateRepository = mock(WorkoutTemplateRepository.class);
        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);
        ProgrammeRepository programmeRepository = mock(ProgrammeRepository.class);
        AnalysisCacheEvictor analysisCacheEvictor = mock(AnalysisCacheEvictor.class);

        ExerciseDefinition canonical = buildDefinition(UUID.fromString("00000000-0000-0000-0000-000000000666"), "Low Row", null);
        when(exerciseDefinitionRepository.findByIdAndUserId(eq(canonical.getId()), eq(USER_ID))).thenReturn(java.util.Optional.of(canonical));
        when(exerciseDefinitionRepository.findByUserIdAndIdIn(eq(USER_ID), anyCollection())).thenReturn(new ArrayList<>());

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

        assertThatThrownBy(() -> service.collapse(USER_ID, canonical.getId(), List.of(UUID.randomUUID())))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private ExerciseDefinition buildDefinition(UUID id, String exerciseName, String variant) {
        ExerciseDefinition definition = new ExerciseDefinition();
        ReflectionTestUtils.setField(definition, "id", id);
        definition.setUserId(USER_ID);
        definition.setExerciseName(exerciseName);
        definition.setVariant(variant);
        definition.setNormalizedExerciseName(exerciseName.toLowerCase().replace(' ', '_'));
        definition.setNormalizedVariant(variant == null ? "" : variant.toLowerCase().replace(' ', '_'));
        definition.setMappingSource(MappingSource.CATALOG);
        definition.setSecondaryMuscles(new java.util.LinkedHashSet<>());
        definition.setExerciseInfo(new ExerciseInfo());
        return definition;
    }
}
