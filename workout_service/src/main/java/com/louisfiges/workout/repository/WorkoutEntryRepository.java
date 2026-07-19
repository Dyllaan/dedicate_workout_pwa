package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutInol;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkoutEntryRepository extends JpaRepository<WorkoutEntry, UUID>, WorkoutEntryStartupReadRepository {

    List<WorkoutEntry> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query("""
    SELECT DISTINCT we
    FROM WorkoutEntry we
    WHERE we.userId = :userId
    ORDER BY we.createdAt DESC
    """)
    List<WorkoutEntry> findDetailedHistoryByUserId(@Param("userId") UUID userId);

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query(
            value = """
                    SELECT DISTINCT we
                    FROM WorkoutEntry we
                    WHERE we.userId = :userId
                    ORDER BY we.createdAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(we)
                    FROM WorkoutEntry we
                    WHERE we.userId = :userId
                    """
    )
    Page<WorkoutEntry> findDetailedHistoryPageByUserId(@Param("userId") UUID userId, Pageable pageable);

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query("""
    SELECT we
    FROM WorkoutEntry we
    WHERE we.userId = :userId
    ORDER BY we.createdAt DESC
    """)
    List<WorkoutEntry> findDetailedHistoryByUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
    SELECT DISTINCT we
    FROM WorkoutEntry we
    LEFT JOIN FETCH we.template
    WHERE we.userId = :userId
    ORDER BY we.createdAt DESC
    """)
    List<WorkoutEntry> findHistoryByUserId(@Param("userId") UUID userId);

    @Query(
            value = """
                    SELECT DISTINCT we
                    FROM WorkoutEntry we
                    LEFT JOIN FETCH we.template
                    WHERE we.userId = :userId
                    ORDER BY we.createdAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(we)
                    FROM WorkoutEntry we
                    WHERE we.userId = :userId
                    """
    )
    Page<WorkoutEntry> findHistoryPageByUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
    SELECT we
    FROM WorkoutEntry we
    LEFT JOIN FETCH we.template
    WHERE we.userId = :userId
    ORDER BY we.createdAt DESC
    """)
    List<WorkoutEntry> findHistoryByUserId(@Param("userId") UUID userId, Pageable pageable);

    Optional<WorkoutEntry> findByIdAndUserId(UUID id, UUID userId);

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query("""
    SELECT we
    FROM WorkoutEntry we
    WHERE we.id = :id AND we.userId = :userId
    """)
    Optional<WorkoutEntry> findDetailedByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT we FROM WorkoutEntry we WHERE we.userId = :userId " +
            "AND we.createdAt >= :startDate AND we.createdAt <= :endDate " +
            "ORDER BY we.createdAt DESC")
    List<WorkoutEntry> findByUserIdAndCreatedAtBetween(
            @Param("userId") UUID userId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query("""
    SELECT DISTINCT we
    FROM WorkoutEntry we
    WHERE we.userId = :userId
      AND we.createdAt >= :startDate
      AND we.createdAt <= :endDate
    ORDER BY we.createdAt DESC
    """)
    List<WorkoutEntry> findDetailedHistoryByUserIdAndCreatedAtBetween(
            @Param("userId") UUID userId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query(
            value = """
                    SELECT DISTINCT we
                    FROM WorkoutEntry we
                    WHERE we.userId = :userId
                      AND we.createdAt >= :startDate
                      AND we.createdAt <= :endDate
                    ORDER BY we.createdAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(we)
                    FROM WorkoutEntry we
                    WHERE we.userId = :userId
                      AND we.createdAt >= :startDate
                      AND we.createdAt <= :endDate
                    """
    )
    Page<WorkoutEntry> findDetailedHistoryPageByUserIdAndCreatedAtBetween(
            @Param("userId") UUID userId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate,
            Pageable pageable
    );

    @Query("""
    SELECT DISTINCT we
    FROM WorkoutEntry we
    LEFT JOIN FETCH we.template
    WHERE we.userId = :userId
      AND we.createdAt >= :startDate
      AND we.createdAt <= :endDate
    ORDER BY we.createdAt DESC
    """)
    List<WorkoutEntry> findHistoryByUserIdAndCreatedAtBetween(
            @Param("userId") UUID userId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );

    @Query(
            value = """
                    SELECT DISTINCT we
                    FROM WorkoutEntry we
                    LEFT JOIN FETCH we.template
                    WHERE we.userId = :userId
                      AND we.createdAt >= :startDate
                      AND we.createdAt <= :endDate
                    ORDER BY we.createdAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(we)
                    FROM WorkoutEntry we
                    WHERE we.userId = :userId
                      AND we.createdAt >= :startDate
                      AND we.createdAt <= :endDate
                    """
    )
    Page<WorkoutEntry> findHistoryPageByUserIdAndCreatedAtBetween(
            @Param("userId") UUID userId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate,
            Pageable pageable
    );

    @Query("SELECT we FROM WorkoutEntry we WHERE we.userId = :userId " +
            "ORDER BY we.createdAt DESC LIMIT :limit")
    List<WorkoutEntry> findTopNByUserIdOrderByCreatedAtDesc(
            @Param("userId") UUID userId,
            @Param("limit") int limit
    );

    @Query("SELECT we FROM WorkoutEntry we WHERE we.template.id = :templateId " +
            "AND we.userId = :userId ORDER BY we.createdAt DESC")
    List<WorkoutEntry> findByTemplateIdAndUserId(
            @Param("templateId") UUID templateId,
            @Param("userId") UUID userId
    );

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query("""
    SELECT DISTINCT we
    FROM WorkoutEntry we
    WHERE we.template.id = :templateId
      AND we.userId = :userId
    ORDER BY we.createdAt DESC
    """)
    List<WorkoutEntry> findDetailedHistoryByTemplateIdAndUserId(
            @Param("templateId") UUID templateId,
            @Param("userId") UUID userId
    );

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query(
            value = """
                    SELECT DISTINCT we
                    FROM WorkoutEntry we
                    WHERE we.template.id = :templateId
                      AND we.userId = :userId
                    ORDER BY we.createdAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(we)
                    FROM WorkoutEntry we
                    WHERE we.template.id = :templateId
                      AND we.userId = :userId
                    """
    )
    Page<WorkoutEntry> findDetailedHistoryPageByTemplateIdAndUserId(
            @Param("templateId") UUID templateId,
            @Param("userId") UUID userId,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets"})
    @Query("""
    SELECT DISTINCT we
    FROM WorkoutEntry we
    WHERE we.userId = :userId
      AND we.id IN :entryIds
    """)
    List<WorkoutEntry> findDetailedByIdInAndUserId(
            @Param("entryIds") List<UUID> entryIds,
            @Param("userId") UUID userId
    );

    @Query("""
    SELECT DISTINCT we
    FROM WorkoutEntry we
    LEFT JOIN FETCH we.template
    WHERE we.template.id = :templateId
      AND we.userId = :userId
    ORDER BY we.createdAt DESC
    """)
    List<WorkoutEntry> findHistoryByTemplateIdAndUserId(
            @Param("templateId") UUID templateId,
            @Param("userId") UUID userId
    );

    @Query(
            value = """
                    SELECT DISTINCT we
                    FROM WorkoutEntry we
                    LEFT JOIN FETCH we.template
                    WHERE we.template.id = :templateId
                      AND we.userId = :userId
                    ORDER BY we.createdAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(we)
                    FROM WorkoutEntry we
                    WHERE we.template.id = :templateId
                      AND we.userId = :userId
                    """
    )
    Page<WorkoutEntry> findHistoryPageByTemplateIdAndUserId(
            @Param("templateId") UUID templateId,
            @Param("userId") UUID userId,
            Pageable pageable
    );

    @Query("""
    SELECT we FROM WorkoutEntry we
    JOIN we.exercises ee
    WHERE we.userId = :userId
    AND ee.loggedExerciseName = :exerciseName
    ORDER BY we.createdAt DESC
    LIMIT :limit
""")
    List<WorkoutEntry> findRecentByUserAndExercise(
            @Param("userId") UUID userId,
            @Param("exerciseName") String exerciseName,
            @Param("limit") int limit
    );

    @EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query("""
    SELECT DISTINCT we
    FROM WorkoutEntry we
    JOIN we.exercises ee
    WHERE we.userId = :userId
      AND ee.exerciseDefinition.id = :exerciseDefinitionId
    ORDER BY we.createdAt DESC
    """)
    List<WorkoutEntry> findAllByUserIdAndExerciseDefinitionId(
            @Param("userId") UUID userId,
            @Param("exerciseDefinitionId") UUID exerciseDefinitionId
    );

    @EntityGraph(attributePaths = {"exercises", "exercises.sets", "exercises.exerciseDefinition"})
    @Query("""
    SELECT we FROM WorkoutEntry we
    WHERE we.userId = :userId
      AND we.id NOT IN (
        SELECT wi.workoutEntry.id FROM WorkoutInol wi WHERE wi.userId = :userId
      )
    """)
    List<WorkoutEntry> findEntriesMissingInol(@Param("userId") UUID userId);

    // has the user logged any workout
    boolean existsByUserId(UUID userId);

    long countByUserId(UUID userId);

    void deleteByIdAndUserId(UUID id, UUID userId);

    // find most recent by user id
        Optional<WorkoutEntry> findTopByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT se, we.createdAt FROM WorkoutEntry we " +
           "JOIN we.exercises ee " +
           "JOIN ee.sets se " +
           "WHERE ee.exerciseDefinition.id = :exerciseDefId " +
           "AND we.userId = :userId " +
           "AND we.createdAt BETWEEN :blockStart AND :blockEnd " +
           "ORDER BY (se.weight * (1 + se.reps / 30.0)) DESC")
    List<Object[]> findBestSetsForExerciseInBlock(
            @Param("exerciseDefId") UUID exerciseDefId,
            @Param("userId") UUID userId,
            @Param("blockStart") Instant blockStart,
            @Param("blockEnd") Instant blockEnd,
            Pageable pageable);
}
