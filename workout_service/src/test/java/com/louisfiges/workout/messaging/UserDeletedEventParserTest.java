package com.louisfiges.workout.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("UserDeletedEventParser")
class UserDeletedEventParserTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final UserDeletedEventParser parser = new UserDeletedEventParser(objectMapper);

    @Test
    void parsesValidPayload() throws Exception {
        UUID userId = UUID.randomUUID();
        String payload = objectMapper.writeValueAsString(new UserDeletedEventMessage(
                UUID.randomUUID(),
                UserDeletedEventMessage.EVENT_TYPE,
                Instant.parse("2026-04-25T22:00:00Z"),
                userId,
                "auth-service"
        ));

        UserDeletedEventMessage event = parser.parse(payload);

        assertThat(event.userId()).isEqualTo(userId);
        assertThat(event.eventType()).isEqualTo(UserDeletedEventMessage.EVENT_TYPE);
    }

    @Test
    void rejectsUnexpectedEventType() throws Exception {
        String payload = objectMapper.writeValueAsString(new UserDeletedEventMessage(
                UUID.randomUUID(),
                "USER_UPDATED",
                Instant.parse("2026-04-25T22:00:00Z"),
                UUID.randomUUID(),
                "auth-service"
        ));

        assertThatThrownBy(() -> parser.parse(payload))
                .isInstanceOf(InvalidUserDeletedEventException.class)
                .hasMessageContaining("Unexpected eventType");
    }
}
