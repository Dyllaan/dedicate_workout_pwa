package com.louisfiges.workout.dao.workout;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;
import java.util.UUID;

import com.louisfiges.workout.dto.ExerciseConfigDTO;
import com.louisfiges.workout.dto.DtoConvertible;

/**
 * ExerciseConfig is the configuration of an ExerciseDefinition existing within the workout template
 */

@Entity
@Table(name = "exercise_configs")
public class ExerciseConfig implements DtoConvertible<ExerciseConfigDTO> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID exerciseConfigId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_definition_id", nullable = false)
    private ExerciseDefinition exerciseDefinition;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workout_template_id", nullable = false)
    private WorkoutTemplate workoutTemplate;

    @Column(name = "exercise_order", nullable = false)
    private int exerciseOrder;

    @Column(name = "goal_sets", nullable = false)
    private int goalSets;

    @Column(name = "goal_reps")
    private Integer goalReps;

    @Enumerated(EnumType.STRING)
    @Column(name = "progression_mode", nullable = false)
    private ProgressionMode progressionMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "primary_benchmark", nullable = false)
    private PrimaryBenchmark primaryBenchmark;

    @Column(name = "target_rest_seconds")
    private Integer targetRestSeconds;

    @Column(name = "focus")
    private Boolean focus;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private Long version = 0L;

    public ExerciseConfig() { }

    public ExerciseConfig(
            ExerciseDefinition exerciseDefinition,
            int goalSets,
            Integer goalReps,
            ProgressionMode progressionMode,
            PrimaryBenchmark primaryBenchmark,
            Integer targetRestSeconds,
            Boolean focus
    ) {
        this.exerciseDefinition = exerciseDefinition;
        this.goalSets = goalSets;
        this.goalReps = goalReps;
        this.progressionMode = progressionMode == null ? ProgressionMode.WEIGHT_FIRST : progressionMode;
        this.primaryBenchmark = primaryBenchmark == null ? PrimaryBenchmark.WORKING_SETS : primaryBenchmark;
        this.targetRestSeconds = targetRestSeconds;
        this.focus = focus;
    }

    public ExerciseConfigDTO toDTO() {

        return new ExerciseConfigDTO(
                exerciseConfigId,
                exerciseDefinition.toDTO(),
                goalSets,
                goalReps,
                progressionMode,
                primaryBenchmark,
                targetRestSeconds,
                focus
        );
    }

    public UUID getExerciseConfigId() { return exerciseConfigId; }
    public void setExerciseConfigId(UUID exerciseConfigId) { this.exerciseConfigId = exerciseConfigId; }

    public ExerciseDefinition getExerciseDefinition() { return exerciseDefinition; }
    public void setExerciseDefinition(ExerciseDefinition exerciseDefinition) { this.exerciseDefinition = exerciseDefinition; }

    public WorkoutTemplate getWorkoutTemplate() { return workoutTemplate; }
    public void setWorkoutTemplate(WorkoutTemplate workoutTemplate) { this.workoutTemplate = workoutTemplate; }

    public int getExerciseOrder() { return exerciseOrder; }
    public void setExerciseOrder(int exerciseOrder) { this.exerciseOrder = exerciseOrder; }

    public int getGoalSets() { return goalSets; }
    public void setGoalSets(int goalSets) { this.goalSets = goalSets; }

    public Integer getGoalReps() { return goalReps; }
    public void setGoalReps(Integer goalReps) { this.goalReps = goalReps; }

    public ProgressionMode getProgressionMode() { return progressionMode; }
    public void setProgressionMode(ProgressionMode progressionMode) {
        this.progressionMode = progressionMode == null ? ProgressionMode.WEIGHT_FIRST : progressionMode;
    }

    public PrimaryBenchmark getPrimaryBenchmark() { return primaryBenchmark; }
    public void setPrimaryBenchmark(PrimaryBenchmark primaryBenchmark) {
        this.primaryBenchmark = primaryBenchmark == null ? PrimaryBenchmark.WORKING_SETS : primaryBenchmark;
    }

    public Integer getTargetRestSeconds() { return targetRestSeconds; }
    public void setTargetRestSeconds(Integer targetRestSeconds) { this.targetRestSeconds = targetRestSeconds; }

    public Boolean getFocus() { return focus; }
    public void setFocus(Boolean focus) { this.focus = focus; }
}
