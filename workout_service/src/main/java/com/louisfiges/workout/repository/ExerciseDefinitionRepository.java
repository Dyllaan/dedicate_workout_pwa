package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseDefinitionRepository extends JpaRepository<ExerciseDefinition, UUID> {

    @EntityGraph(attributePaths = {"exerciseInfo", "exerciseInfo.equipment"})
    Optional<ExerciseDefinition> findByIdAndUserId(UUID id, UUID userId);

    @EntityGraph(attributePaths = {"exerciseInfo", "exerciseInfo.equipment"})
    Optional<ExerciseDefinition> findByUserIdAndNormalizedExerciseNameAndNormalizedVariant(
            UUID userId,
            String normalizedExerciseName,
            String normalizedVariant
    );

    @EntityGraph(attributePaths = {"exerciseInfo", "secondaryMuscles"})
    List<ExerciseDefinition> findByUserIdAndIdIn(UUID userId, Collection<UUID> ids);

    @EntityGraph(attributePaths = {"exerciseInfo", "secondaryMuscles"})
    List<ExerciseDefinition> findByUserIdOrderByExerciseNameAscVariantAsc(UUID userId);

    @EntityGraph(attributePaths = {"exerciseInfo", "secondaryMuscles"})
    List<ExerciseDefinition> findAllByUserIdAndExerciseInfo_Id(UUID userId, Long exerciseInfoId);

    @EntityGraph(attributePaths = {"exerciseInfo", "secondaryMuscles"})
    Page<ExerciseDefinition> findByUserIdOrderByExerciseNameAscVariantAsc(UUID userId, Pageable pageable);

    @EntityGraph(attributePaths = {"exerciseInfo", "secondaryMuscles"})
    @Query(
            value = """
                    SELECT ed
                    FROM ExerciseDefinition ed
                    WHERE ed.userId = :userId
                      AND (
                          :query IS NULL OR :query = '' OR
                          LOWER(ed.exerciseName) LIKE LOWER(CONCAT('%', :query, '%')) OR
                          LOWER(COALESCE(ed.variant, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR
                          LOWER(COALESCE(ed.normalizedExerciseName, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR
                          LOWER(COALESCE(ed.normalizedVariant, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                      )
                    ORDER BY ed.exerciseName ASC, ed.variant ASC
                    """,
            countQuery = """
                    SELECT COUNT(ed)
                    FROM ExerciseDefinition ed
                    WHERE ed.userId = :userId
                      AND (
                          :query IS NULL OR :query = '' OR
                          LOWER(ed.exerciseName) LIKE LOWER(CONCAT('%', :query, '%')) OR
                          LOWER(COALESCE(ed.variant, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR
                          LOWER(COALESCE(ed.normalizedExerciseName, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR
                          LOWER(COALESCE(ed.normalizedVariant, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                      )
                    """
    )
    Page<ExerciseDefinition> findByUserIdAndQuery(UUID userId, String query, Pageable pageable);

    @EntityGraph(attributePaths = {"exerciseInfo", "secondaryMuscles"})
    @Query("""
        SELECT ed FROM ExerciseDefinition ed
        WHERE ed.userId = :userId
          AND ed.exerciseName IN (
              SELECT ed2.exerciseName FROM ExerciseDefinition ed2
              WHERE ed2.userId = :userId
              GROUP BY ed2.exerciseName
              HAVING COUNT(ed2) > 1
          )
        ORDER BY ed.exerciseName ASC, ed.variant ASC
        """)
    List<ExerciseDefinition> findDuplicatesByUserId(UUID userId);
}
