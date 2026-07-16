package com.louisfiges.workout.dao.workout;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.Objects;

@Entity
@Table(name = "exercise_info_muscles")
public class ExerciseInfoMuscle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_info_id", nullable = false)
    private ExerciseInfo exerciseInfo;

    @Enumerated(EnumType.STRING)
    @Column(name = "muscle_role", nullable = false)
    private ExerciseInfoMuscleRole muscleRole;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "muscle_group_id", nullable = false)
    private ExerciseCatalogMuscleGroup muscleGroup;

    public ExerciseInfoMuscle() {
    }

    public ExerciseInfoMuscle(ExerciseInfo exerciseInfo, ExerciseInfoMuscleRole muscleRole, ExerciseCatalogMuscleGroup muscleGroup) {
        this.exerciseInfo = exerciseInfo;
        this.muscleRole = muscleRole;
        this.muscleGroup = muscleGroup;
    }

    public Long getId() {
        return id;
    }

    public ExerciseInfo getExerciseInfo() {
        return exerciseInfo;
    }

    public void setExerciseInfo(ExerciseInfo exerciseInfo) {
        this.exerciseInfo = exerciseInfo;
    }

    public ExerciseInfoMuscleRole getMuscleRole() {
        return muscleRole;
    }

    public void setMuscleRole(ExerciseInfoMuscleRole muscleRole) {
        this.muscleRole = muscleRole;
    }

    public ExerciseCatalogMuscleGroup getMuscleGroup() {
        return muscleGroup;
    }

    public void setMuscleGroup(ExerciseCatalogMuscleGroup muscleGroup) {
        this.muscleGroup = muscleGroup;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ExerciseInfoMuscle that)) {
            return false;
        }
        return muscleRole == that.muscleRole
                && Objects.equals(muscleGroupName(), that.muscleGroupName());
    }

    @Override
    public int hashCode() {
        return Objects.hash(muscleRole, muscleGroupName());
    }

    private String muscleGroupName() {
        return muscleGroup == null ? null : muscleGroup.getName();
    }
}
