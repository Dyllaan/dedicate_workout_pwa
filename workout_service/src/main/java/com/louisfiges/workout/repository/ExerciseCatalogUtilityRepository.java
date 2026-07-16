package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.ExerciseCatalogUtility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExerciseCatalogUtilityRepository extends JpaRepository<ExerciseCatalogUtility, Long> {
    Optional<ExerciseCatalogUtility> findByNameIgnoreCase(String name);
}
