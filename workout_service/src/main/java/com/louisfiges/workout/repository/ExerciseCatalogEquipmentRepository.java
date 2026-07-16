package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExerciseCatalogEquipmentRepository extends JpaRepository<ExerciseCatalogEquipment, Long> {
    Optional<ExerciseCatalogEquipment> findByNameIgnoreCase(String name);
}
