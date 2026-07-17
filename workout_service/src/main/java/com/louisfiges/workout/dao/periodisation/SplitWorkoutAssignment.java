package com.louisfiges.workout.dao.periodisation;

import jakarta.persistence.*;
import java.util.UUID;

import com.louisfiges.workout.dao.workout.WorkoutTemplate;

@Entity
@Table(name = "split_workout_assignments",
    uniqueConstraints = @UniqueConstraint(columnNames = {"split_id", "workout_template_id"}))
public class SplitWorkoutAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "split_id", nullable = false)
    private Split split;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workout_template_id", nullable = false)
    private WorkoutTemplate workoutTemplate;

    @Column(nullable = false, columnDefinition = "INTEGER DEFAULT 1")
    private int sessionsPerWeek = 1;

    @Column(nullable = false)
    private int workoutOrder;

    public SplitWorkoutAssignment() {}

    public SplitWorkoutAssignment(Split split, WorkoutTemplate workoutTemplate, int sessionsPerWeek, int workoutOrder) {
        this.split = split;
        this.workoutTemplate = workoutTemplate;
        this.sessionsPerWeek = sessionsPerWeek;
        this.workoutOrder = workoutOrder;
    }

    public SplitWorkoutAssignment(WorkoutTemplate workoutTemplate, int sessionsPerWeek, int workoutOrder) {
        this.workoutTemplate = workoutTemplate;
        this.sessionsPerWeek = sessionsPerWeek;
        this.workoutOrder = workoutOrder;
    }

    public UUID getId() {
        return id;
    }
    
    public Split getSplit() {
        return split;
    }

    public WorkoutTemplate getWorkoutTemplate() {
        return workoutTemplate;
    }

    public int getSessionsPerWeek() {
        return sessionsPerWeek;
    }

    public int getWorkoutOrder() {
        return workoutOrder;
    }

    public void setSplit(Split split) {
        this.split = split;
    }

    public void setWorkoutTemplate(WorkoutTemplate workoutTemplate) {
        this.workoutTemplate = workoutTemplate;
    }

    public void setSessionsPerWeek(int sessionsPerWeek) {
        this.sessionsPerWeek = sessionsPerWeek;
    }

    public void setWorkoutOrder(int workoutOrder) {
        this.workoutOrder = workoutOrder;
    }
}