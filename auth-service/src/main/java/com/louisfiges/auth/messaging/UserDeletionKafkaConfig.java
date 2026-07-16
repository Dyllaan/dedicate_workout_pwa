package com.louisfiges.auth.messaging;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@EnableConfigurationProperties(UserDeletionKafkaProperties.class)
public class UserDeletionKafkaConfig {

    @Bean
    public NewTopic userDeletedTopic(UserDeletionKafkaProperties properties) {
        return TopicBuilder.name(properties.getUserDeletedTopic())
                .partitions(1)
                .replicas(1)
                .build();
    }
}
