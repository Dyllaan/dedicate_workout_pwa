package com.louisfiges.workout.dao.periodisation;

import com.louisfiges.workout.dao.interfaces.DAO;
import com.louisfiges.workout.dto.responses.WeekDTO;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "block_weeks")
public class Week implements DAO<WeekDTO> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "block_id", nullable = false)
    private Block block;

    @Column(nullable = false)
    private int weekNumber; // 1-indexed within the block

    @Column(nullable = false)
    private boolean deload = false;

    @Column(nullable = false)
    private int targetSetsPerExercise;

    @Column(nullable = true)
    private Double rpeOverrideMin;

    @Column(nullable = true)
    private Double rpeOverrideMax;

    public boolean isDeload() { return deload; }
    public void setDeload(boolean deload) { this.deload = deload; }

    @Override
    public WeekDTO toDTO() {
        return new WeekDTO(
                id,
                weekNumber,
                deload,
                targetSetsPerExercise,
                rpeOverrideMin,
                rpeOverrideMax
        );
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Block getBlock() {
        return block;
    }

    public void setBlock(Block block) {
        this.block = block;
    }

    public int getWeekNumber() {
        return weekNumber;
    }

    public void setWeekNumber(int weekNumber) {
        this.weekNumber = weekNumber;
    }

    public int getTargetSetsPerExercise() {
        return targetSetsPerExercise;
    }

    public void setTargetSetsPerExercise(int targetSetsPerExercise) {
        this.targetSetsPerExercise = targetSetsPerExercise;
    }

    public Double getRpeOverrideMin() {
        return rpeOverrideMin;
    }

    public void setRpeOverrideMin(Double rpeOverrideMin) {
        this.rpeOverrideMin = rpeOverrideMin;
    }

    public Double getRpeOverrideMax() {
        return rpeOverrideMax;
    }

    public void setRpeOverrideMax(Double rpeOverrideMax) {
        this.rpeOverrideMax = rpeOverrideMax;
    }

}
