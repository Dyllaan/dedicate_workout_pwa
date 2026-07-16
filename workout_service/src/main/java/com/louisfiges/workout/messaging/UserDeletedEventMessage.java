package com.louisfiges.workout.messaging;

import java.time.Instant;
import java.util.UUID;

public record UserDeletedEventMessage(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        UUID userId,
        String source
) {
    public static final String EVENT_TYPE = "USER_DELETED";
}
