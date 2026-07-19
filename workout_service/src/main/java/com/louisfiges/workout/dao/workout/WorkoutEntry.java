package com.louisfiges.workout.dao.workout;

import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workout_entries")
public class WorkoutEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_template_id", nullable = false)
    private WorkoutTemplate template;

    @Column(nullable = false)
    private UUID userId;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "workout_entry_id")
    @OrderColumn(name = "exercise_order")
    @Fetch(FetchMode.SUBSELECT)
    private List<ExerciseEntry> exercises = new ArrayList<>();

    @Column(length = 500)
    private String notes;

    @Column(name = "is_1rm_test")
    private Boolean is1rmTest;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private Long version = 0L;

    public WorkoutEntry() { }

    public WorkoutEntry(WorkoutTemplate template, UUID userId, List<ExerciseEntry> exercises, String notes) {
        this(template, userId, exercises, notes, null);
    }

    public WorkoutEntry(WorkoutTemplate template, UUID userId, List<ExerciseEntry> exercises, String notes, Boolean is1rmTest) {
        this.template = template;
        this.userId = userId;
        this.exercises = exercises;
        this.notes = notes;
        this.is1rmTest = is1rmTest;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public WorkoutTemplate getTemplate() { return template; }
    public void setTemplate(WorkoutTemplate template) { this.template = template; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public List<ExerciseEntry> getExercises() { return exercises; }
    public void setExercises(List<ExerciseEntry> exercises) { this.exercises = exercises; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Boolean getIs1rmTest() { return is1rmTest; }
    public void setIs1rmTest(Boolean is1rmTest) { this.is1rmTest = is1rmTest; }

    public Instant getCreatedAt() { return createdAt; }
}
