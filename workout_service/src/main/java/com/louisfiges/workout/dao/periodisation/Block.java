package com.louisfiges.workout.dao.periodisation;

import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.periodisation.BlockType;
import com.louisfiges.workout.dto.DtoConvertible;
import com.louisfiges.workout.dto.responses.BlockDTO;
import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "blocks")
public class Block implements DtoConvertible<BlockDTO> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "programme_id", nullable = false)
    private Programme programme;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlockType blockType; // HYPERTROPHY, STRENGTH, PEAKING, DELOAD

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProgressionStrategy progressionStrategy;

    @Column(nullable = false)
    private int durationWeeks;

    @Column(nullable = false)
    private double targetRpeMin;

    @Column(nullable = false)
    private double targetRpeMax;

    @Column(nullable = false)
    private int repRangeMin;

    @Column(nullable = false)
    private int repRangeMax;

    @Column(nullable = false)
    private int blockOrder; // position within the split's sequence

    @Column(nullable = true)
    private Instant startDate;

    @OneToMany(mappedBy = "block", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("weekNumber ASC")
    @Fetch(FetchMode.SUBSELECT)
    private List<Week> weeks = new ArrayList<>();

    public Block() { }

    public Block(Programme programme, String name, BlockType blockType, ProgressionStrategy progressionStrategy,
                 int durationWeeks, double targetRpeMin, double targetRpeMax,
                 int repRangeMin, int repRangeMax, int blockOrder, Instant startDate) {
        this.programme = programme;
        this.name = name;
        this.blockType = blockType;
        this.progressionStrategy = progressionStrategy;
        this.durationWeeks = durationWeeks;
        this.targetRpeMin = targetRpeMin;
        this.targetRpeMax = targetRpeMax;
        this.repRangeMin = repRangeMin;
        this.repRangeMax = repRangeMax;
        this.blockOrder = blockOrder;
        this.startDate = startDate;
    }

    @Override
    public BlockDTO toDTO() {
        return new BlockDTO(
            id,
            name,
            blockType,
            progressionStrategy,
            durationWeeks,
            targetRpeMin,
            targetRpeMax,
            repRangeMin,
            repRangeMax,
            blockOrder,
            startDate,
            weeks.stream().map(Week::toDTO).toList()
        );
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public Programme getProgramme() { return programme; }
    public void setProgramme(Programme programme) { this.programme = programme; }

    public void setName(String name) { this.name = name; }

    public BlockType getBlockType() { return blockType; }
    public void setBlockType(BlockType blockType) { this.blockType = blockType; }

    public ProgressionStrategy getProgressionStrategy() { return progressionStrategy; }
    public void setProgressionStrategy(ProgressionStrategy s) { this.progressionStrategy = s; }
    public int getDurationWeeks() { return durationWeeks; }
    public void setDurationWeeks(int durationWeeks) { this.durationWeeks = durationWeeks; }

    public double getTargetRpeMin() { return targetRpeMin; }
    public void setTargetRpeMin(double targetRpeMin) { this.targetRpeMin = targetRpeMin; }

    public double getTargetRpeMax() { return targetRpeMax; }
    public void setTargetRpeMax(double targetRpeMax) { this.targetRpeMax = targetRpeMax; }

    public int getRepRangeMin() { return repRangeMin; }
    public void setRepRangeMin(int repRangeMin) { this.repRangeMin = repRangeMin; }

    public int getRepRangeMax() { return repRangeMax; }
    public void setRepRangeMax(int repRangeMax) { this.repRangeMax = repRangeMax; }
    public int getBlockOrder() { return blockOrder; }
    public void setBlockOrder(int blockOrder) { this.blockOrder = blockOrder; }

    public Instant getStartDate() { return startDate; }
    public void setStartDate(Instant startDate) { this.startDate = startDate; }
    public List<Week> getWeeks() { return weeks; }
    public void setWeeks(List<Week> weeks) { this.weeks = weeks; }
}
