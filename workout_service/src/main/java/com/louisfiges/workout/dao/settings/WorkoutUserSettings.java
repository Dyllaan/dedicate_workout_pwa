package com.louisfiges.workout.dao.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "workout_user_settings")
public class WorkoutUserSettings {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "default_rest_seconds", nullable = false)
    private int defaultRestSeconds;

    public WorkoutUserSettings() {
    }

    public WorkoutUserSettings(UUID userId, int defaultRestSeconds) {
        this.userId = userId;
        this.defaultRestSeconds = defaultRestSeconds;
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public int getDefaultRestSeconds() { return defaultRestSeconds; }
    public void setDefaultRestSeconds(int defaultRestSeconds) { this.defaultRestSeconds = defaultRestSeconds; }
}
