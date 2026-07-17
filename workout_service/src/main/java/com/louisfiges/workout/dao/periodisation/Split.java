package com.louisfiges.workout.dao.periodisation;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "splits")
public class Split {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean active = false;

    @OneToMany(mappedBy = "split", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("workoutOrder ASC")
    private List<SplitWorkoutAssignment> assignments = new ArrayList<>();

    @OneToMany(mappedBy = "split", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Programme> programmes = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public Split() {}

    public Split(String name, UUID userId, List<SplitWorkoutAssignment> assignments) {
        this.name = name;
        this.userId = userId;
        this.assignments.addAll(assignments);
    }
    
    public Split(String name, UUID userId) {
        this.name = name;
        this.userId = userId;
    }

    public void addWorkoutAssignment(SplitWorkoutAssignment assignment) {
        assignment.setSplit(this);
        assignments.add(assignment);
    }

    public UUID getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public UUID getUserId() { return userId; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public List<SplitWorkoutAssignment> getAssignments() { return assignments; }
    public void setAssignments(List<SplitWorkoutAssignment> incoming) {
        this.assignments.clear();
        this.assignments.addAll(incoming);
    }

    public List<Programme> getProgrammes() { return programmes; }

    public Instant getCreatedAt() { return createdAt; }

    public void setId(UUID uuid) { this.id = uuid; }
}