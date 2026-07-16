package com.louisfiges.workout.validation;

import com.louisfiges.workout.exception.exceptions.BadRequestException;

public final class RestTimeValidator {
    public static final int DEFAULT_REST_SECONDS = 90;
    public static final int MAX_REST_SECONDS = 7200;

    private RestTimeValidator() {
    }

    public static Integer validateOptional(Integer seconds) {
        if (seconds == null) {
            return null;
        }
        validate(seconds);
        return seconds;
    }

    public static int validate(int seconds) {
        if (seconds < 0 || seconds > MAX_REST_SECONDS) {
            throw new BadRequestException("Rest time must be between 0 and 7200 seconds");
        }
        return seconds;
    }
}
