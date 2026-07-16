package com.louisfiges.workout.dao.workout;

import com.louisfiges.workout.dao.interfaces.DAO;
import com.louisfiges.workout.dto.responses.WorkoutEntryDTO;
import com.louisfiges.workout.dto.responses.ExerciseEntryDTO;
import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workout_entries")
public class WorkoutEntry implements DAO<WorkoutEntryDTO> {

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

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public WorkoutEntry() { }

    public WorkoutEntry(WorkoutTemplate template, UUID userId, List<ExerciseEntry> exercises, String notes) {
        this.template = template;
        this.userId = userId;
        this.exercises = exercises;
        this.notes = notes;
    }

    @Override
    public WorkoutEntryDTO toDTO() {
        List<ExerciseEntryDTO> exerciseDTOs = exercises.stream()
                .map(ExerciseEntry::toDTO)
                .toList();

        LocalDateTime createdDateTime = createdAt != null
                ? LocalDateTime.ofInstant(createdAt, ZoneId.systemDefault())
                : LocalDateTime.now();

        return new WorkoutEntryDTO(id, template.toDTO(), exerciseDTOs, notes, createdDateTime);
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

    public Instant getCreatedAt() { return createdAt; }
}
