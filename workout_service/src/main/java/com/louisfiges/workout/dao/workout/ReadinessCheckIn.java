package com.louisfiges.workout.dao.workout;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "readiness_check_ins")
public class ReadinessCheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(name = "workout_entry_id")
    private UUID workoutEntryId;

    @Column(nullable = false)
    private short sleepQuality;

    @Column(nullable = false)
    private short stressLevel;

    @Column(nullable = false)
    private short sorenessLevel;

    @Column(nullable = false)
    private short confidenceLevel;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public ReadinessCheckIn() {
    }

    public ReadinessCheckIn(
            UUID userId,
            short sleepQuality,
            short stressLevel,
            short sorenessLevel,
            short confidenceLevel
    ) {
        this(userId, null, sleepQuality, stressLevel, sorenessLevel, confidenceLevel);
    }

    public ReadinessCheckIn(
            UUID userId,
            UUID workoutEntryId,
            short sleepQuality,
            short stressLevel,
            short sorenessLevel,
            short confidenceLevel
    ) {
        this.userId = userId;
        this.workoutEntryId = workoutEntryId;
        this.sleepQuality = sleepQuality;
        this.stressLevel = stressLevel;
        this.sorenessLevel = sorenessLevel;
        this.confidenceLevel = confidenceLevel;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getWorkoutEntryId() {
        return workoutEntryId;
    }

    public short getSleepQuality() {
        return sleepQuality;
    }

    public short getStressLevel() {
        return stressLevel;
    }

    public short getSorenessLevel() {
        return sorenessLevel;
    }

    public short getConfidenceLevel() {
        return confidenceLevel;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
