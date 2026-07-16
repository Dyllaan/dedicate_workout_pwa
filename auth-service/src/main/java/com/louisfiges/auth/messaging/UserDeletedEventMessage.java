package com.louisfiges.auth.messaging;

import java.time.Clock;
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

    public static UserDeletedEventMessage fromDomainEvent(
            UserDeletedDomainEvent domainEvent,
            String source,
            Clock clock
    ) {
        return new UserDeletedEventMessage(
                UUID.randomUUID(),
                EVENT_TYPE,
                Instant.now(clock),
                domainEvent.userId(),
                source
        );
    }
}
