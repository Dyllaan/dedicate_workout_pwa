package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.ExerciseCatalogForce;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExerciseCatalogForceRepository extends JpaRepository<ExerciseCatalogForce, Long> {
    Optional<ExerciseCatalogForce> findByNameIgnoreCase(String name);
}
