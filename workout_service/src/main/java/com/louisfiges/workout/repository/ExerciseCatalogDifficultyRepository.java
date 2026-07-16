package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.ExerciseCatalogDifficulty;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseCatalogDifficultyRepository extends JpaRepository<ExerciseCatalogDifficulty, Integer> {
}
