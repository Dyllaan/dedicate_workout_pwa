package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dao.workout.ExerciseCatalogDifficulty;
import com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment;
import com.louisfiges.workout.dao.workout.ExerciseCatalogForce;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMechanics;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup;
import com.louisfiges.workout.dao.workout.ExerciseCatalogUtility;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscle;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscleRole;
import com.louisfiges.workout.repository.ExerciseCatalogDifficultyRepository;
import com.louisfiges.workout.repository.ExerciseCatalogEquipmentRepository;
import com.louisfiges.workout.repository.ExerciseCatalogForceRepository;
import com.louisfiges.workout.repository.ExerciseCatalogMechanicsRepository;
import com.louisfiges.workout.repository.ExerciseCatalogMuscleGroupRepository;
import com.louisfiges.workout.repository.ExerciseCatalogUtilityRepository;
import com.louisfiges.workout.repository.ExerciseInfoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class ExerciseInfoService {

    private final ExerciseInfoRepository repo;
    private final ExerciseCatalogEquipmentRepository equipmentRepository;
    private final ExerciseCatalogUtilityRepository utilityRepository;
    private final ExerciseCatalogMechanicsRepository mechanicsRepository;
    private final ExerciseCatalogForceRepository forceRepository;
    private final ExerciseCatalogDifficultyRepository difficultyRepository;
    private final ExerciseCatalogMuscleGroupRepository muscleGroupRepository;

    public ExerciseInfoService(
            ExerciseInfoRepository repo,
            ExerciseCatalogEquipmentRepository equipmentRepository,
            ExerciseCatalogUtilityRepository utilityRepository,
            ExerciseCatalogMechanicsRepository mechanicsRepository,
            ExerciseCatalogForceRepository forceRepository,
            ExerciseCatalogDifficultyRepository difficultyRepository,
            ExerciseCatalogMuscleGroupRepository muscleGroupRepository
    ) {
        this.repo = repo;
        this.equipmentRepository = equipmentRepository;
        this.utilityRepository = utilityRepository;
        this.mechanicsRepository = mechanicsRepository;
        this.forceRepository = forceRepository;
        this.difficultyRepository = difficultyRepository;
        this.muscleGroupRepository = muscleGroupRepository;
    }

    public List<ExerciseInfo> findAll() {
        return repo.findAllByOrderByNameAscVariationAsc();
    }

    public Optional<ExerciseInfo> findById(Long id) {
        return repo.findById(id);
    }

    public List<ExerciseInfo> findByName(String name) {
        return repo.findByName(name);
    }

    public List<ExerciseInfo> findByMainMuscle(String mainMuscle) {
        return repo.findByMainMuscle_NameIgnoreCase(mainMuscle);
    }

    public List<ExerciseInfo> findByTargetMuscle(String muscle) {
        return repo.findByTargetMuscleContaining(muscle);
    }

    public List<ExerciseInfo> findByEquipment(String equipment) {
        return repo.findByEquipment_NameIgnoreCase(equipment);
    }

    public List<ExerciseInfo> findByMechanics(String mechanics) {
        return repo.findByMechanics_NameIgnoreCase(mechanics);
    }

    public List<ExerciseInfo> findByDifficulty(Integer difficulty) {
        return repo.findByDifficultyLookup_Level(difficulty);
    }

    public List<ExerciseInfo> findByMaxDifficulty(Integer max) {
        return repo.findByDifficultyLookup_LevelLessThanEqual(max);
    }

    public List<ExerciseInfo> findByDifficultyRange(Integer min, Integer max) {
        return repo.findByDifficultyLookup_LevelBetween(min, max);
    }

    public List<ExerciseInfo> findVariations(Long parentId) {
        return repo.findByParentId(parentId);
    }

    public List<ExerciseInfo> findByMainMuscleAndEquipment(String mainMuscle, String equipment) {
        return repo.findByMainMuscle_NameIgnoreCaseAndEquipment_NameIgnoreCase(mainMuscle, equipment);
    }

    public List<ExerciseInfo> findByMainMuscleAndMaxDifficulty(String mainMuscle, Integer maxDifficulty) {
        return repo.findByMainMuscle_NameIgnoreCaseAndDifficultyLookup_LevelLessThanEqual(mainMuscle, maxDifficulty);
    }

    public List<ExerciseInfo> search(String term) {
        return repo.searchByName(term);
    }

    @Transactional
    public ExerciseInfo save(ExerciseInfo exercise) {
        return repo.save(normalize(exercise));
    }

    @Transactional
    public ExerciseInfo update(Long id, ExerciseInfo updated) {
        ExerciseInfo existing = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Exercise not found: " + id));

        existing.setName(updated.getName());
        existing.setEquipment(resolveEquipment(updated.getEquipmentLookup()));
        existing.setVariation(updated.getVariation());
        existing.setUtility(resolveUtility(updated.getUtilityLookup()));
        existing.setMechanics(resolveMechanics(updated.getMechanicsLookup()));
        existing.setForce(resolveForce(updated.getForceLookup()));
        existing.setPreparation(updated.getPreparation());
        existing.setExecution(updated.getExecution());
        existing.setMainMuscle(resolveMuscleGroup(updated.getMainMuscleLookup()));
        existing.setDifficulty(resolveDifficulty(updated.getDifficultyLookup()));
        existing.replaceMuscles(buildMuscleRows(existing, updated.getMuscles()));
        existing.setParentId(updated.getParentId());

        return repo.save(normalize(existing));
    }

    @Transactional
    public void deleteById(Long id) {
        repo.deleteById(id);
    }

    private ExerciseInfo normalize(ExerciseInfo exercise) {
        exercise.setEquipment(resolveEquipment(exercise.getEquipmentLookup()));
        exercise.setUtility(resolveUtility(exercise.getUtilityLookup()));
        exercise.setMechanics(resolveMechanics(exercise.getMechanicsLookup()));
        exercise.setForce(resolveForce(exercise.getForceLookup()));
        exercise.setDifficulty(resolveDifficulty(exercise.getDifficultyLookup()));
        exercise.setMainMuscle(resolveMuscleGroup(exercise.getMainMuscleLookup()));
        exercise.replaceMuscles(buildMuscleRows(exercise, exercise.getMuscles()));
        return exercise;
    }

    private ExerciseCatalogEquipment resolveEquipment(ExerciseCatalogEquipment equipment) {
        String name = requireLookupName(equipment == null ? null : equipment.getName(), "equipment");
        return equipmentRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> equipmentRepository.save(new ExerciseCatalogEquipment(name)));
    }

    private ExerciseCatalogUtility resolveUtility(ExerciseCatalogUtility utility) {
        String name = requireLookupName(utility == null ? null : utility.getName(), "utility");
        return utilityRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> utilityRepository.save(new ExerciseCatalogUtility(name)));
    }

    private ExerciseCatalogMechanics resolveMechanics(ExerciseCatalogMechanics mechanics) {
        String name = requireLookupName(mechanics == null ? null : mechanics.getName(), "mechanics");
        return mechanicsRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> mechanicsRepository.save(new ExerciseCatalogMechanics(name)));
    }

    private ExerciseCatalogForce resolveForce(ExerciseCatalogForce force) {
        String name = requireLookupName(force == null ? null : force.getName(), "force");
        return forceRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> forceRepository.save(new ExerciseCatalogForce(name)));
    }

    private ExerciseCatalogDifficulty resolveDifficulty(ExerciseCatalogDifficulty difficulty) {
        if (difficulty == null || difficulty.getLevel() == null) {
            throw new IllegalArgumentException("Difficulty is required");
        }
        Integer level = difficulty.getLevel();
        return difficultyRepository.findById(level)
                .orElseGet(() -> difficultyRepository.save(new ExerciseCatalogDifficulty(level)));
    }

    private ExerciseCatalogMuscleGroup resolveMuscleGroup(ExerciseCatalogMuscleGroup muscleGroup) {
        String name = requireLookupName(muscleGroup == null ? null : muscleGroup.getName(), "main muscle");
        return muscleGroupRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> muscleGroupRepository.save(new ExerciseCatalogMuscleGroup(name)));
    }

    private Set<ExerciseInfoMuscle> buildMuscleRows(ExerciseInfo exercise, Set<ExerciseInfoMuscle> sourceMuscles) {
        Set<ExerciseInfoMuscle> muscles = new LinkedHashSet<>();
        if (sourceMuscles == null) {
            return muscles;
        }
        for (ExerciseInfoMuscle source : sourceMuscles) {
            if (source == null || source.getMuscleRole() == null || source.getMuscleGroup() == null) {
                continue;
            }
            ExerciseCatalogMuscleGroup muscleGroup = resolveMuscleGroup(source.getMuscleGroup());
            muscles.add(new ExerciseInfoMuscle(exercise, source.getMuscleRole(), muscleGroup));
        }
        return muscles;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String requireLookupName(String value, String label) {
        String trimmed = clean(value);
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException(label + " is required");
        }
        return trimmed;
    }
}
