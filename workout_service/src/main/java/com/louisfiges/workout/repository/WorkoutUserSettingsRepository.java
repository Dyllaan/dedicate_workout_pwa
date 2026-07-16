package com.louisfiges.workout.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.louisfiges.workout.dao.settings.WorkoutUserSettings;

import java.util.UUID;

@Repository
public interface WorkoutUserSettingsRepository extends JpaRepository<WorkoutUserSettings, UUID> {
}
