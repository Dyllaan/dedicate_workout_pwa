package com.louisfiges.workout.dao.workout;

import com.louisfiges.workout.dto.DtoConvertible;
import com.louisfiges.workout.dto.responses.ExerciseEntryDTO;
import com.louisfiges.workout.dto.responses.SetEntryDTO;
import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "exercise_entries")
public class ExerciseEntry implements DtoConvertible<ExerciseEntryDTO> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_definition_id", nullable = false)
    private ExerciseDefinition exerciseDefinition;

    @Column(name = "logged_exercise_name", nullable = false)
    private String loggedExerciseName;

    @Column(name = "logged_variant")
    private String loggedVariant;

    @Column(name = "goal_sets")
    private Integer goalSets;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "exercise_entry_id")
    @OrderColumn(name = "set_order")
    @Fetch(FetchMode.SUBSELECT)
    private List<SetEntry> sets = new ArrayList<>();

    public ExerciseEntry() { }

    // no template config
    public ExerciseEntry(ExerciseDefinition exerciseDefinition, String loggedExerciseName, String loggedVariant, Integer goalSets, List<SetEntry> sets) {
        this.exerciseDefinition = exerciseDefinition;
        this.loggedExerciseName = loggedExerciseName;
        this.loggedVariant = loggedVariant;
        this.goalSets = goalSets;
        this.sets = sets;
    }

    @Override
    public ExerciseEntryDTO toDTO() {
        List<SetEntryDTO> setDTOs = sets.stream()
                .map(SetEntry::toDTO)
                .toList();

        return new ExerciseEntryDTO(
                goalSets,
                setDTOs,
                loggedExerciseName,
                loggedVariant,
                exerciseDefinition == null ? null : exerciseDefinition.getId()
        );
    }

    public UUID getId() { return id; }

    public ExerciseDefinition getExerciseDefinition() { return exerciseDefinition; }
    public void setExerciseDefinition(ExerciseDefinition exerciseDefinition) { this.exerciseDefinition = exerciseDefinition; }

    public String getLoggedExerciseName() { return loggedExerciseName; }
    public void setLoggedExerciseName(String loggedExerciseName) { this.loggedExerciseName = loggedExerciseName; }

    public String getLoggedVariant() { return loggedVariant; }
    public void setLoggedVariant(String loggedVariant) { this.loggedVariant = loggedVariant; }

    public Integer getGoalSets() { return goalSets; }
    public void setGoalSets(Integer goalSets) { this.goalSets = goalSets; }

    public List<SetEntry> getSets() { return sets; }
    public void setSets(List<SetEntry> sets) { this.sets = sets; }
}
