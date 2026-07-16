package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.periodisation.Block;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BlockRepository extends JpaRepository<Block, UUID> {

    // block -> programme -> split -> userId
    @Query("SELECT b FROM Block b JOIN b.programme.split s WHERE b.id = :blockId AND s.userId = :userId")
    Optional<Block> findByIdAndUserId(@Param("blockId") UUID blockId, @Param("userId") UUID userId);

    @Query("SELECT DISTINCT b FROM Block b LEFT JOIN FETCH b.weeks WHERE b.programme.id = :programmeId ORDER BY b.blockOrder ASC")
    List<Block> findByProgrammeIdOrderByBlockOrder(@Param("programmeId") UUID programmeId);
}
