package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.periodisation.Programme;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProgrammeRepository extends JpaRepository<Programme, UUID> {

    @Query("SELECT p FROM Programme p JOIN p.split s WHERE s.userId = :userId AND s.id = :splitId")
    List<Programme> findByUserIdAndSplitId(@Param("userId") UUID userId, @Param("splitId") UUID splitId);

    @Query(
            value = """
                    SELECT DISTINCT p
                    FROM Programme p
                    JOIN p.split s
                    LEFT JOIN FETCH p.blocks
                    WHERE s.userId = :userId AND s.id = :splitId
                    """,
            countQuery = """
                    SELECT COUNT(p)
                    FROM Programme p
                    JOIN p.split s
                    WHERE s.userId = :userId AND s.id = :splitId
                    """
    )
    Page<Programme> findPageByUserIdAndSplitId(@Param("userId") UUID userId, @Param("splitId") UUID splitId, Pageable pageable);

    @EntityGraph(attributePaths = {"blocks", "split"})
    @Query("SELECT DISTINCT p FROM Programme p JOIN p.split s WHERE s.userId = :userId")
    List<Programme> findAllByUserId(@Param("userId") UUID userId);

    // get by programme id and user id
    @Query("SELECT p FROM Programme p JOIN p.split s WHERE p.id = :programmeId AND s.userId = :userId")
    Optional<Programme> findByIdAndUserId(@Param("programmeId") UUID programmeId, @Param("userId") UUID userId);

    @Modifying
    @Query("""
    UPDATE Programme p
    SET p.active = false
    WHERE EXISTS (
        SELECT 1
        FROM Split s
        JOIN s.programmes sp
        WHERE s.id = :splitId AND sp.id = p.id
    )
    """)
    void deactivateAllBySplitId(@Param("splitId") UUID splitId);

    boolean existsBySplitUserId(UUID userId);
}
