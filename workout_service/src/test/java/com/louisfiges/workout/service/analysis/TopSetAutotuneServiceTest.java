package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.analysis.types.RecommendedAction;
import com.louisfiges.workout.analysis.types.TrainingState;
import com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.ReadinessCheckIn;
import com.louisfiges.workout.dto.responses.insights.PrioritySignalDTO;
import com.louisfiges.workout.dto.responses.insights.TopSetAutotuneRecommendationDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.repository.ExerciseDefinitionRepository;
import com.louisfiges.workout.repository.ReadinessCheckInRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TopSetAutotuneService")
class TopSetAutotuneServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID TEMPLATE_ID = UUID.fromString("00000000-0000-0000-0000-000000000202");
    private static final UUID MATCHING_DEFINITION_ID = UUID.fromString("00000000-0000-0000-0000-000000000303");
    private static final UUID OTHER_DEFINITION_ID = UUID.fromString("00000000-0000-0000-0000-000000000404");

    @Mock
    private TrainingInsightsService trainingInsightsService;

    @Mock
    private ReadinessCheckInRepository readinessCheckInRepository;

    @Mock
    private ExerciseDefinitionRepository exerciseDefinitionRepository;

    @Test
    @DisplayName("snaps barbell maintain recommendations to the nearest 1.25kg increment")
    void snapsBarbellMaintainRecommendationsToNearestIncrement() {
        TopSetAutotuneService service = new TopSetAutotuneService(
                trainingInsightsService,
                readinessCheckInRepository,
                exerciseDefinitionRepository,
                1.25,
                2.5
        );
        ExerciseDefinition definition = definition("Bench Press", "Barbell");
        when(trainingInsightsService.getPrioritySignals(USER_ID)).thenReturn(
                List.of(signal(MATCHING_DEFINITION_ID, "Bench Press", "Barbell", 101.4, TrainingState.IMPROVING, com.louisfiges.workout.analysis.types.SuggestionType.MAINTAIN))
        );
        when(readinessCheckInRepository.findFirstByUserIdOrderByCreatedAtDesc(eq(USER_ID))).thenReturn(
                Optional.of(new ReadinessCheckIn(USER_ID, (short) 4, (short) 3, (short) 3, (short) 4))
        );
        when(exerciseDefinitionRepository.findByIdAndUserId(eq(MATCHING_DEFINITION_ID), eq(USER_ID))).thenReturn(Optional.of(definition));

        TopSetAutotuneRecommendationDTO recommendation = service.recommendTopSet(
                USER_ID,
                TEMPLATE_ID,
                MATCHING_DEFINITION_ID,
                "Bench Press",
                "Barbell"
        );

        assertThat(recommendation.adjustedRecommendedWeightKg()).isEqualTo(101.25);
        assertThat(recommendation.recommendedAction()).isEqualTo(RecommendedAction.HOLD_LOAD);
    }

    @Test
    @DisplayName("snaps dumbbell maintain recommendations to the nearest 2.5kg increment")
    void snapsDumbbellMaintainRecommendationsToNearestIncrement() {
        TopSetAutotuneService service = new TopSetAutotuneService(
                trainingInsightsService,
                readinessCheckInRepository,
                exerciseDefinitionRepository,
                1.25,
                2.5
        );
        ExerciseDefinition definition = definition("Dumbbell Fly", "Dumbbell");
        when(trainingInsightsService.getPrioritySignals(USER_ID)).thenReturn(
                List.of(signal(MATCHING_DEFINITION_ID, "Dumbbell Fly", "Dumbbell", 101.4, TrainingState.IMPROVING, com.louisfiges.workout.analysis.types.SuggestionType.MAINTAIN))
        );
        when(readinessCheckInRepository.findFirstByUserIdOrderByCreatedAtDesc(eq(USER_ID))).thenReturn(
                Optional.of(new ReadinessCheckIn(USER_ID, (short) 4, (short) 3, (short) 3, (short) 4))
        );
        when(exerciseDefinitionRepository.findByIdAndUserId(eq(MATCHING_DEFINITION_ID), eq(USER_ID))).thenReturn(Optional.of(definition));

        TopSetAutotuneRecommendationDTO recommendation = service.recommendTopSet(
                USER_ID,
                TEMPLATE_ID,
                MATCHING_DEFINITION_ID,
                "Dumbbell Fly",
                "Dumbbell"
        );

        assertThat(recommendation.adjustedRecommendedWeightKg()).isEqualTo(102.5);
    }

    @Test
    @DisplayName("rounds increase recommendations up and deload recommendations down")
    void roundsIncreaseAndDeloadRecommendationsInTheExpectedDirection() {
        TopSetAutotuneService service = new TopSetAutotuneService(
                trainingInsightsService,
                readinessCheckInRepository,
                exerciseDefinitionRepository,
                1.25,
                2.5
        );
        ExerciseDefinition definition = definition("Bench Press", "Barbell");
        when(exerciseDefinitionRepository.findByIdAndUserId(eq(MATCHING_DEFINITION_ID), eq(USER_ID))).thenReturn(Optional.of(definition));

        when(trainingInsightsService.getPrioritySignals(USER_ID)).thenReturn(
                List.of(signal(MATCHING_DEFINITION_ID, "Bench Press", "Barbell", 100.0, TrainingState.IMPROVING, com.louisfiges.workout.analysis.types.SuggestionType.INCREASE))
        );
        when(readinessCheckInRepository.findFirstByUserIdOrderByCreatedAtDesc(eq(USER_ID))).thenReturn(
                Optional.of(new ReadinessCheckIn(USER_ID, (short) 5, (short) 1, (short) 1, (short) 5))
        );

        TopSetAutotuneRecommendationDTO increase = service.recommendTopSet(
                USER_ID,
                TEMPLATE_ID,
                MATCHING_DEFINITION_ID,
                "Bench Press",
                "Barbell"
        );

        when(trainingInsightsService.getPrioritySignals(USER_ID)).thenReturn(
                List.of(signal(MATCHING_DEFINITION_ID, "Bench Press", "Barbell", 100.0, TrainingState.IMPROVING, com.louisfiges.workout.analysis.types.SuggestionType.DELOAD))
        );
        when(readinessCheckInRepository.findFirstByUserIdOrderByCreatedAtDesc(eq(USER_ID))).thenReturn(
                Optional.of(new ReadinessCheckIn(USER_ID, (short) 1, (short) 5, (short) 5, (short) 1))
        );

        TopSetAutotuneRecommendationDTO deload = service.recommendTopSet(
                USER_ID,
                TEMPLATE_ID,
                MATCHING_DEFINITION_ID,
                "Bench Press",
                "Barbell"
        );

        assertThat(increase.adjustedRecommendedWeightKg()).isEqualTo(102.5);
        assertThat(deload.adjustedRecommendedWeightKg()).isEqualTo(96.25);
        assertThat(increase.recommendedAction()).isEqualTo(RecommendedAction.INCREASE_LOAD);
        assertThat(deload.recommendedAction()).isEqualTo(RecommendedAction.DELOAD);
    }

    @Test
    @DisplayName("falls back to the current decimal rounding when equipment cannot be resolved")
    void fallsBackWhenEquipmentCannotBeResolved() {
        TopSetAutotuneService service = new TopSetAutotuneService(
                trainingInsightsService,
                readinessCheckInRepository,
                exerciseDefinitionRepository,
                1.25,
                2.5
        );
        when(trainingInsightsService.getPrioritySignals(USER_ID)).thenReturn(
                List.of(signal(null, "Accessory Curl", null, 101.36, TrainingState.IMPROVING, com.louisfiges.workout.analysis.types.SuggestionType.MAINTAIN))
        );
        when(readinessCheckInRepository.findFirstByUserIdOrderByCreatedAtDesc(eq(USER_ID))).thenReturn(
                Optional.of(new ReadinessCheckIn(USER_ID, (short) 4, (short) 3, (short) 3, (short) 4))
        );

        TopSetAutotuneRecommendationDTO recommendation = service.recommendTopSet(
                USER_ID,
                TEMPLATE_ID,
                null,
                "Accessory Curl",
                null
        );

        assertThat(recommendation.adjustedRecommendedWeightKg()).isEqualTo(101.4);
    }

    @Test
    @DisplayName("uses the linked exercise definition even when the visible exercise name does not match")
    void usesLinkedExerciseDefinitionRatherThanVisibleLabel() {
        TopSetAutotuneService service = new TopSetAutotuneService(
                trainingInsightsService,
                readinessCheckInRepository,
                exerciseDefinitionRepository,
                1.25,
                2.5
        );
        ExerciseDefinition definition = definition("Bench Press", "Barbell");
        when(trainingInsightsService.getPrioritySignals(USER_ID)).thenReturn(
                List.of(signal(MATCHING_DEFINITION_ID, "Bench Press", "Barbell", 101.4, TrainingState.IMPROVING, com.louisfiges.workout.analysis.types.SuggestionType.MAINTAIN))
        );
        when(readinessCheckInRepository.findFirstByUserIdOrderByCreatedAtDesc(eq(USER_ID))).thenReturn(
                Optional.of(new ReadinessCheckIn(USER_ID, (short) 4, (short) 3, (short) 3, (short) 4))
        );
        when(exerciseDefinitionRepository.findByIdAndUserId(eq(MATCHING_DEFINITION_ID), eq(USER_ID))).thenReturn(Optional.of(definition));

        TopSetAutotuneRecommendationDTO recommendation = service.recommendTopSet(
                USER_ID,
                TEMPLATE_ID,
                MATCHING_DEFINITION_ID,
                "Some Alias That Would Not Match",
                "Definitely Not Barbell"
        );

        assertThat(recommendation.adjustedRecommendedWeightKg()).isEqualTo(101.25);
    }

    private PrioritySignalDTO signal(
            UUID exerciseDefinitionId,
            String exerciseName,
            String variant,
            double suggestedWeightKg,
            TrainingState trainingState,
            com.louisfiges.workout.analysis.types.SuggestionType suggestionType
    ) {
        return new PrioritySignalDTO(
                1,
                exerciseDefinitionId,
                exerciseName,
                variant,
                ExerciseType.UPPER_BODY,
                com.louisfiges.workout.analysis.types.ProgressionMode.WEIGHT_FIRST,
                com.louisfiges.workout.analysis.types.PrimaryBenchmark.WORKING_SETS,
                trainingState,
                suggestionType,
                suggestedWeightKg,
                "test signal"
        );
    }

    private ExerciseDefinition definition(String exerciseName, String equipmentName) {
        ExerciseInfo info = new ExerciseInfo();
        info.setEquipment(new ExerciseCatalogEquipment(equipmentName));
        info.setName(exerciseName);
        info.setVariation(equipmentName);

        ExerciseDefinition definition = new ExerciseDefinition();
        ReflectionTestUtils.setField(definition, "id", MATCHING_DEFINITION_ID);
        definition.setUserId(USER_ID);
        definition.setExerciseName(exerciseName);
        definition.setVariant(equipmentName);
        definition.setNormalizedExerciseName(exerciseName.toLowerCase());
        definition.setNormalizedVariant(equipmentName.toLowerCase());
        definition.setMappingSource(MappingSource.CATALOG);
        definition.setExerciseInfo(info);
        return definition;
    }
}
