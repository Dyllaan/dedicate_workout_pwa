package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.ExerciseCatalogMechanics;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExerciseCatalogMechanicsRepository extends JpaRepository<ExerciseCatalogMechanics, Long> {
    Optional<ExerciseCatalogMechanics> findByNameIgnoreCase(String name);
}
