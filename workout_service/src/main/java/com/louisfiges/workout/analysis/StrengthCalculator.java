package com.louisfiges.workout.analysis;

import com.louisfiges.workout.dto.responses.StrengthEstimate;

import java.text.DecimalFormat;

public class StrengthCalculator {

    DecimalFormat df = new DecimalFormat("#.00");

    private Double epleyFormula(Double weight, int reps) {
        // 1RM = weight * (1 + reps / 30)
        return weight * (1 + reps / 30.0);
    }

    private Double bryzyckiFormula(Double weight, int reps) {
        // 1RM = weight * (36 / (37 - reps))
        return weight * (36.0 / (37 - reps));
    }

    private Double lombardiFormula(Double weight, int reps) {
        // 1RM = weight * (reps ^ 0.10)
        return weight * Math.pow(reps, 0.10);
    }

    public StrengthEstimate estimateOneRepMax(Double weight, int reps) {
        Double epley = epleyFormula(weight, reps);
        Double bryzycki = bryzyckiFormula(weight, reps);
        Double lombardi = lombardiFormula(weight, reps);

        return new StrengthEstimate(
                Double.valueOf(df.format(epley)),
                Double.valueOf(df.format(bryzycki)),
                Double.valueOf(df.format(lombardi))
        );
    }
}
