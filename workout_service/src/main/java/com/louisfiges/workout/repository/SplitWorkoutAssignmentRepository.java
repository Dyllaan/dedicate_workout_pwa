package com.louisfiges.workout.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.louisfiges.workout.dao.periodisation.SplitWorkoutAssignment;

import java.util.List;
import java.util.UUID;

@Repository
public interface SplitWorkoutAssignmentRepository extends JpaRepository<SplitWorkoutAssignment, UUID> {

    List<SplitWorkoutAssignment> findBySplitIdOrderByWorkoutOrder(UUID splitId);

    void deleteBySplitId(UUID splitId);
}