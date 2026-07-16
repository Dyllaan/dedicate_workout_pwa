package com.louisfiges.workout.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.louisfiges.workout.dao.workout.WorkoutTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkoutTemplateRepository extends JpaRepository<WorkoutTemplate, UUID> {

    @EntityGraph(attributePaths = {"exercises", "exercises.exerciseDefinition"})
    List<WorkoutTemplate> findByUserId(UUID userId);

    @EntityGraph(attributePaths = {"exercises", "exercises.exerciseDefinition"})
    Page<WorkoutTemplate> findByUserId(UUID userId, Pageable pageable);

    long countByUserId(UUID userId);

    @EntityGraph(attributePaths = {"exercises", "exercises.exerciseDefinition"})
    List<WorkoutTemplate> findByUserIdAndCategory(UUID userId, String category);

    @EntityGraph(attributePaths = {"exercises", "exercises.exerciseDefinition"})
    Page<WorkoutTemplate> findByUserIdAndCategory(UUID userId, String category, Pageable pageable);

    @EntityGraph(attributePaths = {"exercises", "exercises.exerciseDefinition"})
    Optional<WorkoutTemplate> findByIdAndUserId(UUID id, UUID userId);

    // get all wts that exist for the user from list of template ids
    @Query("SELECT wt FROM WorkoutTemplate wt WHERE wt.id IN :ids AND wt.userId = :userId")
    List<WorkoutTemplate> findAllByIdAndUserId(@Param("ids") List<UUID> ids, @Param("userId") UUID userId);

    @EntityGraph(attributePaths = {"exercises", "exercises.exerciseDefinition"})
    @Query("SELECT wt FROM WorkoutTemplate wt WHERE wt.id IN :ids AND wt.userId = :userId")
    List<WorkoutTemplate> findAllByIdAndUserIdWithExercises(@Param("ids") List<UUID> ids, @Param("userId") UUID userId);

    @Query("SELECT DISTINCT wt.category FROM WorkoutTemplate wt WHERE wt.userId = :userId ORDER BY wt.category")
    List<String> findDistinctCategoriesByUserId(@Param("userId") UUID userId);

    @Query("SELECT DISTINCT ec.exerciseDefinition.exerciseName FROM WorkoutTemplate wt " +
            "JOIN wt.exercises ec WHERE wt.userId = :userId ORDER BY ec.exerciseDefinition.exerciseName")
    List<String> findDistinctExerciseNamesByUserId(@Param("userId") UUID userId);
    void deleteByIdAndUserId(UUID id, UUID userId);
}
