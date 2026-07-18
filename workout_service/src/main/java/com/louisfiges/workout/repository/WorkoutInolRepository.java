package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.WorkoutInol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkoutInolRepository extends JpaRepository<WorkoutInol, UUID> {

    List<WorkoutInol> findByWorkoutEntryId(UUID workoutEntryId);

    @Query("SELECT wi FROM WorkoutInol wi WHERE wi.userId = :userId AND wi.createdAt >= :start AND wi.createdAt < :end")
    List<WorkoutInol> findByUserIdAndCreatedAtBetween(@Param("userId") UUID userId,
                                                       @Param("start") Instant start,
                                                       @Param("end") Instant end);

    @Modifying
    @Query("DELETE FROM WorkoutInol wi WHERE wi.workoutEntry.id = :workoutEntryId")
    void deleteByWorkoutEntryId(@Param("workoutEntryId") UUID workoutEntryId);
}
