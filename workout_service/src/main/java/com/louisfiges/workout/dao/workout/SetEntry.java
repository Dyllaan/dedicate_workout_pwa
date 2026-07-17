package com.louisfiges.workout.dao.workout;

import com.louisfiges.workout.dao.interfaces.DAO;
import com.louisfiges.workout.dto.responses.SetEntryDTO;
import com.louisfiges.workout.analysis.SetRole;
import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "set_entries")
public class SetEntry implements DAO<SetEntryDTO> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private int reps;

    @Column
    private Double weight;

    @Column(nullable = false)
    private Double rpe;

    @Column(length = 100)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "set_role")
    private SetRole setRole;

    @Column(name = "rest_before_seconds")
    private Integer restBeforeSeconds;

    @Version
    private Long version = 0L;

    public SetEntry() { }

    public SetEntry(int reps, Double weight, Double rpe, String notes) {
        this(reps, weight, rpe, notes, null);
    }

    public SetEntry(int reps, Double weight, Double rpe, String notes, SetRole setRole) {
        this(reps, weight, rpe, notes, setRole, null);
    }

    public SetEntry(int reps, Double weight, Double rpe, String notes, SetRole setRole, Integer restBeforeSeconds) {
        this.reps = reps;
        this.weight = weight;
        this.rpe = rpe;
        this.notes = notes;
        this.setRole = setRole;
        this.restBeforeSeconds = restBeforeSeconds;
    }

    @Override
    public SetEntryDTO toDTO() {
        return new SetEntryDTO(id, reps, weight, rpe, notes, setRole, restBeforeSeconds);
    }

    public UUID getId() { return id; }

    public int getReps() { return reps; }
    public void setReps(int reps) { this.reps = reps; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Double getRpe() { return rpe; }
    public void setRpe(Double rpe) { this.rpe = rpe; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public SetRole getSetRole() { return setRole; }
    public void setSetRole(SetRole setRole) { this.setRole = setRole; }

    public Integer getRestBeforeSeconds() { return restBeforeSeconds; }
    public void setRestBeforeSeconds(Integer restBeforeSeconds) { this.restBeforeSeconds = restBeforeSeconds; }
}
