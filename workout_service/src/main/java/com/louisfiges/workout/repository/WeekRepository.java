package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.periodisation.Week;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.repository.query.Param;

public interface WeekRepository extends JpaRepository<Week, UUID> {
    @Query("SELECT w FROM Week w " +
            "JOIN w.block b " +
            "JOIN b.programme p " +
            "JOIN p.split s " +
            "WHERE w.id = :weekId AND s.userId = :userId")
    Optional<Week> findByIdAndUserId(@Param("weekId") UUID weekId, @Param("userId") UUID userId);
}