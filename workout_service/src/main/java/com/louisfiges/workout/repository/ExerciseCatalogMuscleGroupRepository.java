package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExerciseCatalogMuscleGroupRepository extends JpaRepository<ExerciseCatalogMuscleGroup, Long> {
    Optional<ExerciseCatalogMuscleGroup> findByNameIgnoreCase(String name);
}
