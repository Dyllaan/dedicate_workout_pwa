package com.louisfiges.workout.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@Profile("!test")
public class UserDeletedEventListener {

    private static final Logger logger = LoggerFactory.getLogger(UserDeletedEventListener.class);

    private final UserDeletedEventParser eventParser;
    private final UserDataCleanupService userDataCleanupService;

    public UserDeletedEventListener(
            UserDeletedEventParser eventParser,
            UserDataCleanupService userDataCleanupService
    ) {
        this.eventParser = eventParser;
        this.userDataCleanupService = userDataCleanupService;
    }

    @KafkaListener(
            topics = "${app.kafka.user-deleted-topic}",
            groupId = "${app.kafka.user-deleted-group-id}"
    )
    public void onUserDeleted(
            String payload,
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key
    ) {
        UserDeletedEventMessage event = eventParser.parse(payload);
        UUID userId = event.userId();
        logger.info(
                "Processing user deletion event eventId={} userId={} key={}",
                event.eventId(),
                userId,
                key
        );
        userDataCleanupService.deleteAllUserData(userId);
    }
}
