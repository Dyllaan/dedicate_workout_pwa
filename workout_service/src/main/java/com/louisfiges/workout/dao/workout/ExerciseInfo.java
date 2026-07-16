package com.louisfiges.workout.dao.workout;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "exercise_info")
public class ExerciseInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private ExerciseCatalogEquipment equipment;

    @Column
    private String variation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "utility_id", nullable = false)
    private ExerciseCatalogUtility utility;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mechanics_id", nullable = false)
    private ExerciseCatalogMechanics mechanics;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "force_id", nullable = false)
    private ExerciseCatalogForce force;

    @Column(columnDefinition = "TEXT")
    private String preparation;

    @Column(columnDefinition = "TEXT")
    private String execution;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "difficulty_id", nullable = false)
    private ExerciseCatalogDifficulty difficultyLookup;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "main_muscle_id", nullable = false)
    private ExerciseCatalogMuscleGroup mainMuscle;

    @OneToMany(mappedBy = "exerciseInfo", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ExerciseInfoMuscle> muscles = new LinkedHashSet<>();

    @Column(name = "parent_id")
    private Long parentId;

    public ExerciseInfo() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = emptyToNull(name);
    }

    public void setEquipment(ExerciseCatalogEquipment equipment) {
        this.equipment = equipment;
    }

    public ExerciseCatalogEquipment getEquipmentLookup() {
        return equipment;
    }

    public String getVariation() {
        return variation;
    }

    public void setVariation(String variation) {
        this.variation = emptyToNull(variation);
    }

    public void setUtility(ExerciseCatalogUtility utility) {
        this.utility = utility;
    }

    public ExerciseCatalogUtility getUtilityLookup() {
        return utility;
    }

    public void setMechanics(ExerciseCatalogMechanics mechanics) {
        this.mechanics = mechanics;
    }

    public ExerciseCatalogMechanics getMechanicsLookup() {
        return mechanics;
    }

    public void setForce(ExerciseCatalogForce force) {
        this.force = force;
    }

    public ExerciseCatalogForce getForceLookup() {
        return force;
    }

    public String getPreparation() {
        return preparation;
    }

    public void setPreparation(String preparation) {
        this.preparation = preparation;
    }

    public String getExecution() {
        return execution;
    }

    public void setExecution(String execution) {
        this.execution = execution;
    }

    public void setMainMuscle(ExerciseCatalogMuscleGroup mainMuscle) {
        this.mainMuscle = mainMuscle;
    }

    public ExerciseCatalogMuscleGroup getMainMuscleLookup() {
        return mainMuscle;
    }

    public void setDifficulty(ExerciseCatalogDifficulty difficulty) {
        this.difficultyLookup = difficulty;
    }

    public ExerciseCatalogDifficulty getDifficultyLookup() {
        return difficultyLookup;
    }

    public Set<ExerciseInfoMuscle> getMuscles() {
        return muscles;
    }

    public void setMuscles(Set<ExerciseInfoMuscle> muscles) {
        this.muscles = muscles == null ? new LinkedHashSet<>() : new LinkedHashSet<>(muscles);
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public void replaceMuscles(Set<ExerciseInfoMuscle> nextMuscles) {
        this.muscles.clear();
        if (nextMuscles != null) {
            nextMuscles.forEach(muscle -> {
                muscle.setExerciseInfo(this);
                this.muscles.add(muscle);
            });
        }
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

}
