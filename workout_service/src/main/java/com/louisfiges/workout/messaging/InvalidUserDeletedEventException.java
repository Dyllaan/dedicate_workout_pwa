package com.louisfiges.workout.messaging;

public class InvalidUserDeletedEventException extends RuntimeException {

    public InvalidUserDeletedEventException(String message) {
        super(message);
    }

    public InvalidUserDeletedEventException(String message, Throwable cause) {
        super(message, cause);
    }
}
