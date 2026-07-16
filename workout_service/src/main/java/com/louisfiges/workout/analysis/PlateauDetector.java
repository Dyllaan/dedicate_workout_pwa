package com.louisfiges.workout.analysis;

import com.louisfiges.workout.analysis.types.ExerciseSession;
import com.louisfiges.workout.analysis.types.ProgressionSuggestion;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Detects plateaus in a user's exercise progression by analysing trends in estimated 1RM over recent sessions.
 * Uses linear regression to determine if the growth rate has slowed below a specified threshold.
 */
@Component
public class PlateauDetector {

    private final int PLATEAU_WINDOW;
    private final double PLATEAU_THRESHOLD_PERCENT;

    public PlateauDetector(@Value("${plateau.window}") int plateauWindow,
                          @Value("${plateau.threshold.percent}") double plateauThresholdPercent) {
        this.PLATEAU_WINDOW = plateauWindow;
        this.PLATEAU_THRESHOLD_PERCENT = plateauThresholdPercent;
    }


    /**
     * Trend-based plateau detection using linear regression on estimated 1RM
     */
    public Optional<ProgressionSuggestion> detectPlateau(
            List<ExerciseSession> history,
            double currentWeight
    ) {
        if (history.size() < PLATEAU_WINDOW) return Optional.empty();
        List<ExerciseSession> window = history.subList(0, Math.min(PLATEAU_WINDOW, history.size()));

        double[] x = new double[window.size()];
        double[] y = new double[window.size()];
        for (int i = 0; i < window.size(); i++) {
            x[i] = window.size() - 1 - i;
            y[i] = window.get(i).getEstimated1RM();
        }

        LinearRegression regression = LinearRegression.fit(x, y);

        // Only discard scattered/noisy data when there's a meaningful slope.
        // Flat data (slope ≈ 0) produces R²=0 but is unambiguously a plateau.
        if (regression.getRSquared() < 0.4 && Math.abs(regression.getSlope()) > 0.001) {
            return Optional.empty();
        }

        double oldest1RM = window.get(window.size() - 1).getEstimated1RM();
        if (oldest1RM <= 0) return Optional.empty();

        double growthPerSession = (regression.getSlope() / oldest1RM) * 100.0;
        double totalGrowth = growthPerSession * (window.size() - 1);

        if (totalGrowth < PLATEAU_THRESHOLD_PERCENT) {
            return Optional.of(ProgressionSuggestion.plateau(
                    currentWeight,
                    String.format(
                            "Your estimated 1RM trend shows only %.1f%% growth over the last %d sessions. " +
                                    "Consider a deload week, changing rep scheme, or rotating to a variation.",
                            totalGrowth, window.size()
                    )
            ));
        }

        return Optional.empty();
    }
}
