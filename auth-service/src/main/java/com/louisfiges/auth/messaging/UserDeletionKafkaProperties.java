package com.louisfiges.auth.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.kafka")
public class UserDeletionKafkaProperties {

    private String userDeletedTopic = "user.deleted.v1";
    private String userDeletedSource = "auth-service";

    public String getUserDeletedTopic() {
        return userDeletedTopic;
    }

    public void setUserDeletedTopic(String userDeletedTopic) {
        this.userDeletedTopic = userDeletedTopic;
    }

    public String getUserDeletedSource() {
        return userDeletedSource;
    }

    public void setUserDeletedSource(String userDeletedSource) {
        this.userDeletedSource = userDeletedSource;
    }
}
