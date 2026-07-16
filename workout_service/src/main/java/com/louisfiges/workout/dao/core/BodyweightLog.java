package com.louisfiges.workout.dao.core;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "bodyweight_logs")
public class BodyweightLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Column(nullable = false)
    private LocalDate loggedAt;

    @Column(length = 200)
    private String notes;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected BodyweightLog() {
        // JPA requires a no-args constructor for entity materialization.
    }

    public BodyweightLog(UUID userId, BigDecimal weightKg, LocalDate loggedAt, String notes) {
        this.userId = userId;
        this.weightKg = weightKg;
        this.loggedAt = loggedAt;
        this.notes = notes;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public BigDecimal getWeightKg() { return weightKg; }
    public LocalDate getLoggedAt() { return loggedAt; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
