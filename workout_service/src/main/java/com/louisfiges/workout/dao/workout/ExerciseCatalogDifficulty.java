package com.louisfiges.workout.dao.workout;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "exercise_catalog_difficulty")
public class ExerciseCatalogDifficulty {

    @Id
    private Integer level;

    public ExerciseCatalogDifficulty() {
    }

    public ExerciseCatalogDifficulty(Integer level) {
        this.level = level;
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }
}
