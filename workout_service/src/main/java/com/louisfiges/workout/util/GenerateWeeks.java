package com.louisfiges.workout.util;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Week;

import java.util.ArrayList;
import java.util.List;

public class GenerateWeeks {
    public static List<Week> generateWeeks(Block block, int durationWeeks) {
        List<Week> weeks = new ArrayList<>();
        for (int i = 1; i <= durationWeeks; i++) {
            Week week = new Week();
            week.setBlock(block);
            week.setWeekNumber(i);
            boolean isDeload = (i == durationWeeks);
            week.setDeload(isDeload);
            week.setTargetSetsPerExercise(isDeload ? 2 : 2 + i);
            weeks.add(week);
        }
        return weeks;
    }
}
