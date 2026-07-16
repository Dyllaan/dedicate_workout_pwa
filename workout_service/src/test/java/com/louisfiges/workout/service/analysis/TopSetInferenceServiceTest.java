package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.SetRole;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySetDTO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TopSetInferenceServiceTest {

    private final TopSetInferenceService service = new TopSetInferenceService();

    @Test
    void infersTopSetFromBestEstimated1RMWhenNoTopSetIsMarked() {
        ExerciseEntry exercise = exerciseEntry(List.of(
                new SetEntry(1, 100.0, 7.0, null),
                new SetEntry(5, 110.0, 8.0, null),
                new SetEntry(8, 105.0, 7.5, null)
        ));

        List<ExerciseHistorySetDTO> inferred = service.inferHistorySets(exercise);

        assertThat(inferred).hasSize(3);
        assertThat(inferred).extracting(ExerciseHistorySetDTO::setRole)
                .containsExactly(null, null, SetRole.TOP_SET);
    }

    @Test
    void preservesAnExplicitTopSetWhenOneAlreadyExists() {
        ExerciseEntry exercise = exerciseEntry(List.of(
                new SetEntry(1, 100.0, 7.0, null),
                new SetEntry(5, 110.0, 8.0, null, SetRole.TOP_SET),
                new SetEntry(8, 105.0, 7.5, null)
        ));

        List<ExerciseHistorySetDTO> inferred = service.inferHistorySets(exercise);

        assertThat(inferred).extracting(ExerciseHistorySetDTO::setRole)
                .containsExactly(null, SetRole.TOP_SET, null);
    }

    @Test
    void leavesExerciseUnchangedWhenNoSetCanBeScored() {
        ExerciseEntry exercise = exerciseEntry(List.of(
                new SetEntry(8, null, 7.0, null),
                new SetEntry(6, null, 7.5, null)
        ));

        List<ExerciseHistorySetDTO> inferred = service.inferHistorySets(exercise);

        assertThat(inferred).extracting(ExerciseHistorySetDTO::setRole).containsExactly(null, null);
    }

    private ExerciseEntry exerciseEntry(List<SetEntry> sets) {
        return new ExerciseEntry(null, "Bench Press", "Barbell", 3, sets);
    }
}
