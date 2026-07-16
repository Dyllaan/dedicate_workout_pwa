package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkoutTemplateService analysis cache invalidation")
class WorkoutTemplateServiceCacheInvalidationTest {

    @Mock
    private WorkoutTemplateRepository workoutTemplateRepository;

    @Mock
    private ExerciseDefinitionService exerciseDefinitionService;

    @Mock
    private AnalysisCacheEvictor analysisCacheEvictor;

    @InjectMocks
    private WorkoutTemplateService service;

    @Test
    @DisplayName("evicts analysis caches after a template delete")
    void evictsAnalysisCachesAfterDelete() {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000701");
        UUID templateId = UUID.fromString("00000000-0000-0000-0000-000000000702");
        WorkoutTemplate template = new WorkoutTemplate("Upper", userId, "Push", List.of());
        template.setId(templateId);
        when(workoutTemplateRepository.findByIdAndUserId(templateId, userId)).thenReturn(Optional.of(template));

        service.delete(templateId, userId);

        ArgumentCaptor<WorkoutTemplate> templateCaptor = ArgumentCaptor.forClass(WorkoutTemplate.class);
        verify(workoutTemplateRepository).delete(templateCaptor.capture());
        assertThat(templateCaptor.getValue()).isSameAs(template);
        verify(analysisCacheEvictor).evictAnalysisCachesAfterCommit();
    }
}
