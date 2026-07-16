package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.WorkoutApplication;
import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.analysis.types.SuggestionType;
import com.louisfiges.workout.analysis.types.TrainingState;
import com.louisfiges.workout.dao.workout.ReadinessCheckIn;
import com.louisfiges.workout.dto.responses.insights.PrioritySignalDTO;
import com.louisfiges.workout.repository.ExerciseDefinitionRepository;
import com.louisfiges.workout.repository.ReadinessCheckInRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest(
        classes = WorkoutApplication.class,
        properties = {
                "app.analytics.cache.enabled=true",
                "app.analytics.cache.redis.enabled=false"
        }
)
@DisplayName("TopSetAutotuneService cache")
class TopSetAutotuneCacheTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000501");
    private static final UUID TEMPLATE_ID = UUID.fromString("00000000-0000-0000-0000-000000000502");
    private static final UUID EXERCISE_DEFINITION_ID = UUID.fromString("00000000-0000-0000-0000-000000000503");
    private static final UUID OTHER_EXERCISE_DEFINITION_ID = UUID.fromString("00000000-0000-0000-0000-000000000504");

    @Autowired
    private TopSetAutotuneService service;

    @MockBean
    private TrainingInsightsService trainingInsightsService;

    @MockBean
    private ReadinessCheckInRepository readinessCheckInRepository;

    @MockBean
    private ExerciseDefinitionRepository exerciseDefinitionRepository;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    @DisplayName("reuses identical autotune requests and separates distinct keys")
    void cachesIdenticalRequestsAndSeparatesDistinctKeys() {
        when(trainingInsightsService.getPrioritySignals(USER_ID)).thenReturn(
                List.of(
                        new PrioritySignalDTO(
                                1,
                                EXERCISE_DEFINITION_ID,
                                "Bench Press",
                                "Barbell",
                                ExerciseType.UPPER_BODY,
                                ProgressionMode.WEIGHT_FIRST,
                                PrimaryBenchmark.WORKING_SETS,
                                TrainingState.IMPROVING,
                                SuggestionType.INCREASE,
                                100.0,
                                "Base signal"
                        ),
                        new PrioritySignalDTO(
                                2,
                                OTHER_EXERCISE_DEFINITION_ID,
                                "Bench Press",
                                "Barbell",
                                ExerciseType.UPPER_BODY,
                                ProgressionMode.WEIGHT_FIRST,
                                PrimaryBenchmark.WORKING_SETS,
                                TrainingState.IMPROVING,
                                SuggestionType.INCREASE,
                                105.0,
                                "Other signal"
                        )
                )
        );
        when(readinessCheckInRepository.findFirstByUserIdOrderByCreatedAtDesc(eq(USER_ID))).thenReturn(
                Optional.of(new ReadinessCheckIn(USER_ID, (short) 5, (short) 5, (short) 5, (short) 5))
        );
        when(exerciseDefinitionRepository.findByIdAndUserId(eq(EXERCISE_DEFINITION_ID), eq(USER_ID))).thenReturn(Optional.empty());
        when(exerciseDefinitionRepository.findByIdAndUserId(eq(OTHER_EXERCISE_DEFINITION_ID), eq(USER_ID))).thenReturn(Optional.empty());
        when(exerciseDefinitionRepository.findByUserIdAndNormalizedExerciseNameAndNormalizedVariant(eq(USER_ID), eq("bench press"), eq("barbell")))
                .thenReturn(Optional.empty());

        var first = service.recommendTopSet(USER_ID, TEMPLATE_ID, EXERCISE_DEFINITION_ID, "Bench Press", "Barbell");
        var second = service.recommendTopSet(USER_ID, TEMPLATE_ID, EXERCISE_DEFINITION_ID, "Bench Press", "Barbell");
        var different = service.recommendTopSet(USER_ID, TEMPLATE_ID, OTHER_EXERCISE_DEFINITION_ID, "Bench Press", "Barbell");

        assertThat(first.adjustedRecommendedWeightKg()).isEqualTo(second.adjustedRecommendedWeightKg());
        assertThat(different.baseRecommendedWeightKg()).isEqualTo(105.0);
        verify(trainingInsightsService, times(2)).getPrioritySignals(USER_ID);
        verify(readinessCheckInRepository, times(2)).findFirstByUserIdOrderByCreatedAtDesc(USER_ID);
        verify(exerciseDefinitionRepository, times(2)).findByIdAndUserId(EXERCISE_DEFINITION_ID, USER_ID);
    }
}
