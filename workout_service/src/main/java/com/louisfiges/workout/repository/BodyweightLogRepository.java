package com.louisfiges.workout.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.louisfiges.workout.dao.core.BodyweightLog;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BodyweightLogRepository extends JpaRepository<BodyweightLog, UUID> {
    List<BodyweightLog> findByUserIdOrderByLoggedAtDesc(UUID userId, Pageable pageable);
    Page<BodyweightLog> findPageByUserIdOrderByLoggedAtDesc(UUID userId, Pageable pageable);
    Optional<BodyweightLog> findFirstByUserIdAndLoggedAtLessThanEqualOrderByLoggedAtDesc(UUID userId, LocalDate loggedAt);
    void deleteAllByUserId(UUID userId);
}
