package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.SetRole;
import com.louisfiges.workout.analysis.StrengthCalculator;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySetDTO;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class TopSetInferenceService {

    private final StrengthCalculator strengthCalculator = new StrengthCalculator();

    public List<ExerciseHistorySetDTO> inferHistorySets(ExerciseEntry exerciseEntry) {
        if (exerciseEntry == null || exerciseEntry.getSets() == null || exerciseEntry.getSets().isEmpty()) {
            return List.of();
        }

        List<SetEntry> sets = exerciseEntry.getSets();
        int explicitTopSetIndex = findExplicitTopSetIndex(sets);
        int inferredTopSetIndex = explicitTopSetIndex >= 0 ? explicitTopSetIndex : inferTopSetIndex(sets);

        List<ExerciseHistorySetDTO> inferredSets = new ArrayList<>(sets.size());
        for (int i = 0; i < sets.size(); i++) {
            SetEntry set = sets.get(i);
            SetRole inferredRole = set == null ? null : set.getSetRole();
            if (i == inferredTopSetIndex && inferredRole == null) {
                inferredRole = SetRole.TOP_SET;
            }
            inferredSets.add(new ExerciseHistorySetDTO(
                    i + 1,
                    set == null ? 0 : set.getReps(),
                    set == null ? null : set.getWeight(),
                    set == null ? null : set.getRpe(),
                    set == null ? null : set.getNotes(),
                    inferredRole
            ));
        }
        return inferredSets;
    }

    private int findExplicitTopSetIndex(List<SetEntry> sets) {
        for (int i = 0; i < sets.size(); i++) {
            SetEntry set = sets.get(i);
            if (set != null && (set.getSetRole() == SetRole.TOP_SET || set.getSetRole() == SetRole.TOP_SINGLE)) {
                return i;
            }
        }
        return -1;
    }

    private int inferTopSetIndex(List<SetEntry> sets) {
        int bestIndex = -1;
        double bestScore = Double.NEGATIVE_INFINITY;

        for (int i = 0; i < sets.size(); i++) {
            SetEntry set = sets.get(i);
            if (set == null || set.getWeight() == null || set.getReps() <= 0) {
                continue;
            }

            double currentScore = score(set);
            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestIndex = i;
            }
        }

        return bestIndex;
    }

    private double score(SetEntry set) {
        if (set.getWeight() == null || set.getReps() <= 0) {
            return Double.NEGATIVE_INFINITY;
        }

        return strengthCalculator.estimateOneRepMax(set.getWeight(), set.getReps()).epley();
    }

}
