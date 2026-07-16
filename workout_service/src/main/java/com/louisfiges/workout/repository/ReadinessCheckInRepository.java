package com.louisfiges.workout.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.louisfiges.workout.dao.workout.ReadinessCheckIn;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReadinessCheckInRepository extends JpaRepository<ReadinessCheckIn, UUID> {
    interface ReadinessHistoryRow {
        Instant getCreatedAt();

        short getSleepQuality();

        short getStressLevel();

        short getSorenessLevel();

        short getConfidenceLevel();
    }

    Optional<ReadinessCheckIn> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("""
            SELECT r.createdAt AS createdAt,
                   r.sleepQuality AS sleepQuality,
                   r.stressLevel AS stressLevel,
                   r.sorenessLevel AS sorenessLevel,
                   r.confidenceLevel AS confidenceLevel
            FROM ReadinessCheckIn r
            WHERE r.userId = :userId
              AND r.createdAt >= :createdAt
            ORDER BY r.createdAt DESC
            """)
    List<ReadinessHistoryRow> findHistoryByUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            @Param("userId") UUID userId,
            @Param("createdAt") Instant createdAt
    );

    List<ReadinessCheckIn> findByUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(UUID userId, Instant createdAt);
    List<ReadinessCheckIn> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    Page<ReadinessCheckIn> findPageByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("""
            SELECT AVG(
                    1.0 * (
                        r.sleepQuality + (6 - r.stressLevel) + (6 - r.sorenessLevel) + r.confidenceLevel
                    )
            )
            FROM ReadinessCheckIn r
            WHERE r.userId = :userId
              AND r.createdAt >= :createdAt
            """)
    Double getAverageScoreByUserIdAndCreatedAtGreaterThanEqual(
            @Param("userId") UUID userId,
            @Param("createdAt") Instant createdAt
    );
    void deleteAllByUserId(UUID userId);
}
