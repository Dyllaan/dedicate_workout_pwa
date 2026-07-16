package com.louisfiges.workout.repository;
import com.louisfiges.workout.dao.periodisation.Split;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SplitRepository extends JpaRepository<Split, UUID> {
    List<Split> findByUserId(UUID userId);
    long countByUserId(UUID userId);

    @Query("""
    SELECT DISTINCT s
    FROM Split s
    LEFT JOIN FETCH s.assignments a
    LEFT JOIN FETCH a.workoutTemplate
    WHERE s.userId = :userId
    """)
    List<Split> findAllByUserIdWithWorkouts(@Param("userId") UUID userId);

    @Query(
            value = """
                    SELECT DISTINCT s
                    FROM Split s
                    LEFT JOIN FETCH s.assignments a
                    LEFT JOIN FETCH a.workoutTemplate
                    WHERE s.userId = :userId
                    """,
            countQuery = """
                    SELECT COUNT(s)
                    FROM Split s
                    WHERE s.userId = :userId
                    """
    )
    Page<Split> findPageByUserIdWithWorkouts(@Param("userId") UUID userId, Pageable pageable);

    Optional<Split> findByIdAndUserId(UUID id, UUID userId);

    @Query("""
    SELECT DISTINCT s
    FROM Split s
    LEFT JOIN FETCH s.assignments a
    LEFT JOIN FETCH a.workoutTemplate
    WHERE s.id = :id AND s.userId = :userId
    """)
    Optional<Split> findByIdAndUserIdWithWorkouts(@Param("id") UUID id, @Param("userId") UUID userId);

    boolean existsByIdAndUserId(UUID id, UUID userId);

    Optional<Split> findByUserIdAndActiveTrue(UUID userId);

    @Query("""
    SELECT DISTINCT s
    FROM Split s
    LEFT JOIN FETCH s.assignments a
    LEFT JOIN FETCH a.workoutTemplate
    WHERE s.userId = :userId AND s.active = true
    """)
    Optional<Split> findActiveByUserIdWithWorkouts(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE Split s SET s.active = false WHERE s.userId = :userId")
    void deactivateAllForUser(@Param("userId") UUID userId);

    void deleteByIdAndUserId(UUID id, UUID userId);
}
