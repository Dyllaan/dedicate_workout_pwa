package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.workout.*;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InolCalculator")
class InolCalculatorTest {

    @Mock private BlockAwareOneRmService oneRmService;
    @Mock private WorkoutInolRepository inolRepository;
    @InjectMocks private InolCalculator calculator;

    @Captor private ArgumentCaptor<WorkoutInol> inolCaptor;

    private UUID userId;
    private WorkoutEntry entry;
    private ExerciseEntry exerciseEntry;
    private ExerciseDefinition exerciseDef;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        exerciseDef = new ExerciseDefinition();
        ReflectionTestUtils.setField(exerciseDef, "id", UUID.randomUUID());
        exerciseDef.setExerciseName("Bench Press");

        SetEntry set1 = new SetEntry();
        set1.setReps(5);
        set1.setWeight(80.0);

        SetEntry set2 = new SetEntry();
        set2.setReps(3);
        set2.setWeight(90.0);

        exerciseEntry = new ExerciseEntry();
        ReflectionTestUtils.setField(exerciseEntry, "id", UUID.randomUUID());
        exerciseEntry.setExerciseDefinition(exerciseDef);
        exerciseEntry.setLoggedExerciseName("Bench Press");
        exerciseEntry.setSets(List.of(set1, set2));

        WorkoutTemplate template = new WorkoutTemplate();
        ReflectionTestUtils.setField(template, "id", UUID.randomUUID());
        template.setName("Push Day");

        entry = new WorkoutEntry();
        entry.setId(UUID.randomUUID());
        entry.setUserId(userId);
        entry.setTemplate(template);
        entry.setExercises(List.of(exerciseEntry));
    }

    @Test
    @DisplayName("computes and persists INOL when reference 1RM is available")
    void computesInolWhenOneRmAvailable() {
        SetEntry bestSet = new SetEntry();
        bestSet.setReps(3);
        bestSet.setWeight(95.0);

        BlockAwareOneRmService.OneRmResult oneRmResult =
                new BlockAwareOneRmService.OneRmResult(95.5, 96.0, 94.8, bestSet, null, false);

        when(oneRmService.resolveOneRm(exerciseDef.getId(), userId))
                .thenReturn(Optional.of(oneRmResult));

        calculator.computeAndPersist(entry, userId);

        verify(inolRepository).save(inolCaptor.capture());
        WorkoutInol saved = inolCaptor.getValue();

        assertThat(saved.getExerciseName()).isEqualTo("Bench Press");
        assertThat(saved.getInolScore()).isGreaterThan(0.8);
        assertThat(saved.getInolScore()).isLessThan(0.85);
        assertThat(saved.getCarryForward()).isFalse();
    }

    @Test
    @DisplayName("skips exercise when no reference 1RM is available")
    void skipsWhenNoOneRm() {
        when(oneRmService.resolveOneRm(exerciseDef.getId(), userId))
                .thenReturn(Optional.empty());

        calculator.computeAndPersist(entry, userId);

        verify(inolRepository, never()).save(any());
    }

    @Test
    @DisplayName("skips exercise without exercise definition")
    void skipsWhenNoDefinition() {
        exerciseEntry.setExerciseDefinition(null);

        calculator.computeAndPersist(entry, userId);

        verify(oneRmService, never()).resolveOneRm(any(), any());
        verify(inolRepository, never()).save(any());
    }
}
