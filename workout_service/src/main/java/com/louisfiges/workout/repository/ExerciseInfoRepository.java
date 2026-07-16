package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscleRole;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExerciseInfoRepository extends JpaRepository<ExerciseInfo, Long> {

    @Override
    @EntityGraph(attributePaths = {
            "equipment",
            "utility",
            "mechanics",
            "force",
            "difficultyLookup",
            "mainMuscle",
            "muscles",
            "muscles.muscleGroup"
    })
    List<ExerciseInfo> findAll();

    @EntityGraph(attributePaths = {
            "equipment",
            "utility",
            "mechanics",
            "force",
            "difficultyLookup",
            "mainMuscle",
            "muscles",
            "muscles.muscleGroup"
    })
    List<ExerciseInfo> findAllByOrderByNameAscVariationAsc();

    @Override
    @EntityGraph(attributePaths = {
            "equipment",
            "utility",
            "mechanics",
            "force",
            "difficultyLookup",
            "mainMuscle",
            "muscles",
            "muscles.muscleGroup"
    })
    Optional<ExerciseInfo> findById(Long id);

    @EntityGraph(attributePaths = {
            "equipment",
            "utility",
            "mechanics",
            "force",
            "difficultyLookup",
            "mainMuscle",
            "muscles",
            "muscles.muscleGroup"
    })
    List<ExerciseInfo> findByName(String name);

    boolean existsByName(String name);

    List<ExerciseInfo> findByMainMuscle_NameIgnoreCase(String mainMuscle);

    @Query("""
            SELECT DISTINCT e
            FROM ExerciseInfo e
            LEFT JOIN e.muscles m
            LEFT JOIN m.muscleGroup muscleGroup
            WHERE m.muscleRole = :targetRole
              AND LOWER(muscleGroup.name) LIKE LOWER(CONCAT('%', :muscle, '%'))
            """)
    List<ExerciseInfo> findByTargetMuscleContaining(
            @Param("muscle") String muscle,
            @Param("targetRole") ExerciseInfoMuscleRole targetRole
    );

    default List<ExerciseInfo> findByTargetMuscleContaining(String muscle) {
        return findByTargetMuscleContaining(muscle, ExerciseInfoMuscleRole.TARGET);
    }

    List<ExerciseInfo> findByEquipment_NameIgnoreCase(String equipment);

    List<ExerciseInfo> findByMechanics_NameIgnoreCase(String mechanics);

    List<ExerciseInfo> findByDifficultyLookup_Level(Integer difficulty);

    List<ExerciseInfo> findByDifficultyLookup_LevelLessThanEqual(Integer maxDifficulty);

    List<ExerciseInfo> findByDifficultyLookup_LevelBetween(Integer min, Integer max);

    List<ExerciseInfo> findByParentId(Long parentId);

    List<ExerciseInfo> findByMainMuscle_NameIgnoreCaseAndEquipment_NameIgnoreCase(String mainMuscle, String equipment);

    List<ExerciseInfo> findByMainMuscle_NameIgnoreCaseAndDifficultyLookup_LevelLessThanEqual(String mainMuscle, Integer maxDifficulty);

    @EntityGraph(attributePaths = {
            "equipment",
            "mainMuscle"
    })
    @Query("""
            SELECT DISTINCT e
            FROM ExerciseInfo e
            LEFT JOIN e.equipment equipment
            LEFT JOIN e.mainMuscle mainMuscle
            WHERE LOWER(e.name) LIKE LOWER(CONCAT('%', :term, '%'))
               OR LOWER(COALESCE(e.variation, '')) LIKE LOWER(CONCAT('%', :term, '%'))
               OR LOWER(COALESCE(equipment.name, '')) LIKE LOWER(CONCAT('%', :term, '%'))
               OR LOWER(COALESCE(mainMuscle.name, '')) LIKE LOWER(CONCAT('%', :term, '%'))
            """)
    List<ExerciseInfo> searchByName(@Param("term") String term);
}
