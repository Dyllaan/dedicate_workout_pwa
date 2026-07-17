package com.louisfiges.workout.dao.workout;

import com.louisfiges.workout.dao.interfaces.DAO;
import com.louisfiges.workout.dto.responses.WorkoutTemplateDTO;
import com.louisfiges.workout.dto.ExerciseConfigDTO;
import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workout_templates")
public class WorkoutTemplate implements DAO<WorkoutTemplateDTO> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String category;  // Push, "Pull, Legs

    @OneToMany(mappedBy = "workoutTemplate", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("exerciseOrder ASC")
    @Fetch(FetchMode.SUBSELECT)
    private List<ExerciseConfig> exercises = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private Long version = 0L;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkoutEntry> entries = new ArrayList<>();

    public WorkoutTemplate() { }

    public WorkoutTemplate(String name, UUID userId, String category, List<ExerciseConfig> exercises) {
        this.name = name;
        this.userId = userId;
        this.category = category;
        replaceExercises(exercises);
    }

    @Override
    public WorkoutTemplateDTO toDTO() {
        List<ExerciseConfigDTO> exerciseDTOs = exercises.stream()
                .map(config -> config.toDTO())
                .toList();

        LocalDateTime createdDateTime = createdAt != null
                ? LocalDateTime.ofInstant(createdAt, ZoneId.systemDefault())
                : LocalDateTime.now();

        return new WorkoutTemplateDTO(
                id,
                name,
                category,
                exerciseDTOs,
                createdDateTime
        );
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public List<ExerciseConfig> getExercises() { return exercises; }
    public void setExercises(List<ExerciseConfig> exercises) { replaceExercises(exercises); }

    public void replaceExercises(List<ExerciseConfig> exercises) {
        this.exercises.clear();
        if (exercises == null) {
            return;
        }
        for (ExerciseConfig exercise : exercises) {
            addExercise(exercise);
        }
    }

    private void addExercise(ExerciseConfig exercise) {
        exercise.setWorkoutTemplate(this);
        this.exercises.add(exercise);
    }

    public Instant getCreatedAt() { return createdAt; }
}
