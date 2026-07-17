package com.louisfiges.workout.dao.workout;

import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.heatmap.MuscleGroupId;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionDTO;
import com.louisfiges.workout.dto.DtoConvertible;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
        name = "exercise_definitions",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"user_id", "normalized_exercise_name", "normalized_variant"}
        )
)
public class ExerciseDefinition implements DtoConvertible<ExerciseDefinitionDTO> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseName;

    @Column(name = "variant")
    private String variant;

    @Column(name = "normalized_exercise_name", nullable = false)
    private String normalizedExerciseName;

    @Column(name = "normalized_variant", nullable = false)
    private String normalizedVariant;

    @Enumerated(EnumType.STRING)
    @Column(name = "primary_muscle", length = 64)
    private MuscleGroupId primaryMuscle;

    @ElementCollection(targetClass = MuscleGroupId.class, fetch = FetchType.EAGER)
    @CollectionTable(
            name = "exercise_definition_secondary_muscles",
            joinColumns = @JoinColumn(name = "exercise_definition_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "muscle", nullable = false, length = 64)
    private Set<MuscleGroupId> secondaryMuscles = new LinkedHashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_info_id", nullable = true)
    private ExerciseInfo exerciseInfo;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "mapping_source", nullable = false)
    private MappingSource mappingSource; // CUSTOM, AUTO_MAPPED, MANUAL_MAPPED, etc.

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getExerciseName() {
        return exerciseName;
    }

    public void setExerciseName(String exerciseName) {
        this.exerciseName = exerciseName;
    }

    public String getVariant() {
        return variant;
    }

    public void setVariant(String variant) {
        this.variant = variant;
    }

    public String getNormalizedExerciseName() {
        return normalizedExerciseName;
    }

    public void setNormalizedExerciseName(String normalizedExerciseName) {
        this.normalizedExerciseName = normalizedExerciseName;
    }

    public String getNormalizedVariant() {
        return normalizedVariant;
    }

    public void setNormalizedVariant(String normalizedVariant) {
        this.normalizedVariant = normalizedVariant;
    }

    public ExerciseInfo getExerciseInfo() {
        return exerciseInfo;
    }

    public void setExerciseInfo(ExerciseInfo exerciseInfo) {
        this.exerciseInfo = exerciseInfo;
    }

    public MappingSource getMappingSource() {
        return mappingSource;
    }

    public void setMappingSource(MappingSource mappingSource) {
        this.mappingSource = mappingSource;
    }

    public MuscleGroupId getPrimaryMuscle() {
        return primaryMuscle;
    }

    public void setPrimaryMuscle(MuscleGroupId primaryMuscle) {
        this.primaryMuscle = primaryMuscle;
    }

    public Set<MuscleGroupId> getSecondaryMuscles() {
        return secondaryMuscles;
    }

    public void setSecondaryMuscles(Set<MuscleGroupId> secondaryMuscles) {
        this.secondaryMuscles = secondaryMuscles;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public ExerciseDefinitionDTO toDTO() {
        return new ExerciseDefinitionDTO(
                id,
                exerciseName,
                variant,
                exerciseInfo != null ? exerciseInfo.getId() : null,
                mappingSource,
                primaryMuscle,
                secondaryMuscles,
                createdAt,
                updatedAt
        );
    }
}
