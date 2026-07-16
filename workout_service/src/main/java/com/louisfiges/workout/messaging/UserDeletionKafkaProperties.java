package com.louisfiges.workout.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.kafka")
public class UserDeletionKafkaProperties {

    private String userDeletedTopic = "user.deleted.v1";
    private String userDeletedDltTopic = "user.deleted.v1.dlt";
    private String userDeletedGroupId = "workout-service-user-cleanup";

    public String getUserDeletedTopic() {
        return userDeletedTopic;
    }

    public void setUserDeletedTopic(String userDeletedTopic) {
        this.userDeletedTopic = userDeletedTopic;
    }

    public String getUserDeletedDltTopic() {
        return userDeletedDltTopic;
    }

    public void setUserDeletedDltTopic(String userDeletedDltTopic) {
        this.userDeletedDltTopic = userDeletedDltTopic;
    }

    public String getUserDeletedGroupId() {
        return userDeletedGroupId;
    }

    public void setUserDeletedGroupId(String userDeletedGroupId) {
        this.userDeletedGroupId = userDeletedGroupId;
    }
}
