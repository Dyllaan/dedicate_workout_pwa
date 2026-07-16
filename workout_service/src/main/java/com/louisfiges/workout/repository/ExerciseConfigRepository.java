package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.ExerciseConfig;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExerciseConfigRepository extends JpaRepository<ExerciseConfig, UUID> {

    @EntityGraph(attributePaths = {"exerciseDefinition", "workoutTemplate"})
    Optional<ExerciseConfig> findByExerciseConfigIdAndWorkoutTemplateUserId(UUID exerciseConfigId, UUID userId);

    @EntityGraph(attributePaths = {"exerciseDefinition", "workoutTemplate"})
    List<ExerciseConfig> findAllByWorkoutTemplateIdAndWorkoutTemplateUserId(UUID workoutTemplateId, UUID userId);

    List<ExerciseConfig> findAllByExerciseDefinition_IdIn(Collection<UUID> exerciseDefinitionIds);
}
