package com.louisfiges.workout.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.louisfiges.workout.dao.workout.ExerciseEntry;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExerciseEntryRepository extends JpaRepository<ExerciseEntry, UUID> {

    @Query("SELECT DISTINCT ee.loggedExerciseName FROM ExerciseEntry ee " +
            "JOIN WorkoutEntry we ON ee MEMBER OF we.exercises " +
            "WHERE we.userId = :userId ORDER BY ee.loggedExerciseName")
    List<String> findDistinctExerciseNamesByUserId(@Param("userId") UUID userId);

    @Query("SELECT ee FROM ExerciseEntry ee " +
            "JOIN WorkoutEntry we ON ee MEMBER OF we.exercises " +
            "WHERE we.userId = :userId AND ee.loggedExerciseName = :exerciseName " +
            "AND we.createdAt >= :startDate AND we.createdAt <= :endDate " +
            "ORDER BY we.createdAt DESC")
    List<ExerciseEntry> findByExerciseNameAndDateRange(
            @Param("userId") UUID userId,
            @Param("exerciseName") String exerciseName,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
        SELECT ee FROM ExerciseEntry ee
        JOIN WorkoutEntry we ON ee MEMBER OF we.exercises
        WHERE we.userId = :userId
        AND LOWER(ee.loggedExerciseName) = LOWER(:exerciseName)
        ORDER BY we.createdAt DESC
        LIMIT 5
    """)
    List<ExerciseEntry> findRecentByUserAndExercise(
            @Param("userId") UUID userId,
            @Param("exerciseName") String exerciseName
    );

    List<ExerciseEntry> findAllByExerciseDefinition_IdIn(Collection<UUID> exerciseDefinitionIds);

    @Query("""
        SELECT new com.louisfiges.workout.repository.ExerciseDefinitionUsageSummaryRow(
            ee.exerciseDefinition.id,
            COUNT(DISTINCT we.id),
            MAX(we.createdAt)
        )
        FROM WorkoutEntry we
        JOIN we.exercises ee
        WHERE we.userId = :userId
          AND ee.exerciseDefinition.id IN :definitionIds
        GROUP BY ee.exerciseDefinition.id
    """)
    List<ExerciseDefinitionUsageSummaryRow> summarizeUsageByDefinitionIds(
            @Param("userId") UUID userId,
            @Param("definitionIds") Collection<UUID> definitionIds
    );

}
