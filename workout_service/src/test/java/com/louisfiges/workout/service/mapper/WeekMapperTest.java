package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.responses.WeekDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("WeekMapper")
class WeekMapperTest {

    private final WeekMapper mapper = new WeekMapper();

    @Test
    @DisplayName("returns null intensityPct when block is null")
    void nullWhenNoBlock() {
        Week week = createWeek(1, false);
        week.setBlock(null);
        WeekDTO dto = mapper.toDTO(week);
        assertThat(dto.intensityPct()).isNull();
    }

    @Test
    @DisplayName("computes intensity for non-deload week based on block params")
    void computesForTrainingWeek() {
        Block block = new Block();
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setDurationWeeks(4);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);
        week.setBlock(block);

        WeekDTO dto = mapper.toDTO(week);
        assertThat(dto.intensityPct()).isEqualTo(86.0);
    }

    @Test
    @DisplayName("computes intensity for final week with max RPE")
    void computesForFinalWeek() {
        Block block = new Block();
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setDurationWeeks(4);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(4);
        week.setDeload(false);
        week.setTargetSetsPerExercise(3);
        week.setBlock(block);

        WeekDTO dto = mapper.toDTO(week);
        assertThat(dto.intensityPct()).isEqualTo(94.0);
    }

    @Test
    @DisplayName("caps RPE at 6.0 for deload weeks")
    void capsRpeForDeload() {
        Block block = new Block();
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setDurationWeeks(4);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(3);
        week.setDeload(true);
        week.setTargetSetsPerExercise(3);
        week.setBlock(block);

        WeekDTO dto = mapper.toDTO(week);
        assertThat(dto.intensityPct()).isEqualTo(86.0);
    }

    @Test
    @DisplayName("uses rpeOverride from week when set")
    void usesRpeOverride() {
        Block block = new Block();
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setDurationWeeks(4);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(2);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);
        week.setRpeOverrideMin(8.0);
        week.setRpeOverrideMax(8.5);
        week.setBlock(block);

        WeekDTO dto = mapper.toDTO(week);
        assertThat(dto.intensityPct()).isBetween(90.0, 91.5);
    }

    private Week createWeek(int weekNumber, boolean deload) {
        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(weekNumber);
        week.setDeload(deload);
        week.setTargetSetsPerExercise(4);
        return week;
    }
}
