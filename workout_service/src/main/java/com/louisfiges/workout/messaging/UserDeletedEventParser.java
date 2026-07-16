package com.louisfiges.workout.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class UserDeletedEventParser {

    private final ObjectMapper objectMapper;

    public UserDeletedEventParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public UserDeletedEventMessage parse(String payload) {
        try {
            UserDeletedEventMessage event = objectMapper.readValue(payload, UserDeletedEventMessage.class);
            validate(event);
            return event;
        } catch (JsonProcessingException e) {
            throw new InvalidUserDeletedEventException("Invalid user deleted payload", e);
        }
    }

    private void validate(UserDeletedEventMessage event) {
        if (event.userId() == null) {
            throw new InvalidUserDeletedEventException("Missing userId");
        }
        if (!UserDeletedEventMessage.EVENT_TYPE.equals(event.eventType())) {
            throw new InvalidUserDeletedEventException("Unexpected eventType");
        }
        if (event.eventId() == null) {
            throw new InvalidUserDeletedEventException("Missing eventId");
        }
        if (event.occurredAt() == null) {
            throw new InvalidUserDeletedEventException("Missing occurredAt");
        }
        if (event.source() == null || event.source().isBlank()) {
            throw new InvalidUserDeletedEventException("Missing source");
        }
    }
}
