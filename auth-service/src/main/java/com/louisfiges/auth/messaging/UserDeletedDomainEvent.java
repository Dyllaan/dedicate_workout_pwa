package com.louisfiges.auth.messaging;

import java.util.UUID;

public record UserDeletedDomainEvent(UUID userId) {
}
