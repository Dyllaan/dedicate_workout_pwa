package com.louisfiges.auth.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Clock;
import java.util.concurrent.TimeUnit;

@Component
public class UserDeletedKafkaPublisher {

    private static final Logger logger = LoggerFactory.getLogger(UserDeletedKafkaPublisher.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final UserDeletionKafkaProperties properties;
    private final Clock clock;

    @Autowired
    public UserDeletedKafkaPublisher(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            UserDeletionKafkaProperties properties
    ) {
        this(kafkaTemplate, objectMapper, properties, Clock.systemUTC());
    }

    UserDeletedKafkaPublisher(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            UserDeletionKafkaProperties properties,
            Clock clock
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.clock = clock;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUserDeleted(UserDeletedDomainEvent domainEvent) {
        UserDeletedEventMessage message = UserDeletedEventMessage.fromDomainEvent(
                domainEvent,
                properties.getUserDeletedSource(),
                clock
        );

        try {
            String payload = objectMapper.writeValueAsString(message);
            kafkaTemplate.send(properties.getUserDeletedTopic(), domainEvent.userId().toString(), payload)
                    .get(10, TimeUnit.SECONDS);
            logger.info(
                    "Published user deletion event eventId={} userId={} topic={}",
                    message.eventId(),
                    message.userId(),
                    properties.getUserDeletedTopic()
            );
        } catch (Exception e) {
            logger.error(
                    "Failed to publish user deletion event userId={} topic={}",
                    message.userId(),
                    properties.getUserDeletedTopic(),
                    e
            );
        }
    }
}
