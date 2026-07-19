package com.louisfiges.workout.dao.workout;

import com.louisfiges.workout.dao.periodisation.Block;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workout_inol")
public class WorkoutInol {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_entry_id", nullable = false)
    private WorkoutEntry workoutEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_entry_id")
    private ExerciseEntry exerciseEntry;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseName;

    @Column(name = "inol_score", nullable = false)
    private Double inolScore;

    @Column(name = "reference_1rm_kg", nullable = false)
    private Double reference1rmKg;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_id")
    private Block block;

    @Column(name = "carry_forward", nullable = false)
    private Boolean carryForward = false;

    @Column(name = "backfilled", nullable = false)
    private Boolean backfilled = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public WorkoutInol() {}

    public WorkoutInol(UUID userId, WorkoutEntry workoutEntry, ExerciseEntry exerciseEntry,
                       String exerciseName, Double inolScore, Double reference1rmKg,
                       Block block, Boolean carryForward) {
        this.userId = userId;
        this.workoutEntry = workoutEntry;
        this.exerciseEntry = exerciseEntry;
        this.exerciseName = exerciseName;
        this.inolScore = inolScore;
        this.reference1rmKg = reference1rmKg;
        this.block = block;
        this.carryForward = carryForward;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public WorkoutEntry getWorkoutEntry() { return workoutEntry; }
    public ExerciseEntry getExerciseEntry() { return exerciseEntry; }
    public String getExerciseName() { return exerciseName; }
    public Double getInolScore() { return inolScore; }
    public Double getReference1rmKg() { return reference1rmKg; }
    public Block getBlock() { return block; }
    public Boolean getCarryForward() { return carryForward; }
    public Boolean getBackfilled() { return backfilled; }
    public void setBackfilled(Boolean backfilled) { this.backfilled = backfilled; }
    public Instant getCreatedAt() { return createdAt; }
}
