package com.louisfiges.workout.validation;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ValidatorTest {

    private final Validator validator = new Validator(3, 64);

    @Test
    void reportsSpecificReasonsForShortStrings() {
        assertThat(validator.isInvalidString("Ab")).isTrue();
        assertThat(validator.getStringValidationMessage("Workout name", "Ab"))
                .isEqualTo("Workout name must be at least 3 characters long");
    }

    @Test
    void reportsWhitespaceAndCharacterProblemsTogether() {
        assertThat(validator.getStringValidationIssues(" #"))
                .containsExactly(
                        "leading_or_trailing_whitespace",
                        "too_short",
                        "invalid_characters"
                );

        assertThat(validator.getStringValidationMessage("Exercise name", " #"))
                .isEqualTo(
                        "Exercise name must not start or end with whitespace, " +
                                "be at least 3 characters long, and " +
                                "contain only letters, numbers, spaces, and common punctuation"
                );
    }

    @Test
    void reportsRequiredStrings() {
        assertThat(validator.getStringValidationMessage("Workout type", ""))
                .isEqualTo("Workout type is required");
        assertThat(validator.isInvalidString("")).isTrue();
    }
}
