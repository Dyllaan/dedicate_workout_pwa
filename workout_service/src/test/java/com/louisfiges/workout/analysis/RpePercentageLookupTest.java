package com.louisfiges.workout.analysis;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RpePercentageLookup")
class RpePercentageLookupTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
        5  | 7.0  | 86.0
        5  | 8.0  | 89.0
        5  | 9.0  | 91.0
        3  | 7.0  | 89.0
        3  | 8.0  | 92.0
        3  | 9.0  | 94.0
        1  | 10.0 | 100.0
        10 | 6.0  | 76.0
        """)
    @DisplayName("returns known RPE to percentage mappings")
    void returnsKnownMappings(int reps, double rpe, double expectedPct) {
        assertThat(RpePercentageLookup.getIntensityPct(reps, rpe)).isEqualTo(expectedPct);
    }

    @Test
    @DisplayName("interpolates linearly for missing RPE values")
    void interpolatesMissingRpe() {
        double result = RpePercentageLookup.getIntensityPct(5, 7.5);
        assertThat(result).isEqualTo(87.5);
    }

    @Test
    @DisplayName("clamps RPE at 6.0 minimum")
    void clampsRpeMin() {
        double result = RpePercentageLookup.getIntensityPct(5, 5.0);
        assertThat(result).isEqualTo(RpePercentageLookup.getIntensityPct(5, 6.0));
    }

    @Test
    @DisplayName("clamps RPE at 10.0 maximum")
    void clampsRpeMax() {
        double result = RpePercentageLookup.getIntensityPct(5, 11.0);
        assertThat(result).isEqualTo(RpePercentageLookup.getIntensityPct(5, 10.0));
    }

    @Test
    @DisplayName("clamps reps at 1 minimum")
    void clampsRepsMin() {
        double result = RpePercentageLookup.getIntensityPct(0, 8.0);
        assertThat(result).isEqualTo(RpePercentageLookup.getIntensityPct(1, 8.0));
    }

    @Test
    @DisplayName("clamps reps at 15 maximum")
    void clampsRepsMax() {
        double result = RpePercentageLookup.getIntensityPct(20, 8.0);
        assertThat(result).isEqualTo(RpePercentageLookup.getIntensityPct(15, 8.0));
    }
}
