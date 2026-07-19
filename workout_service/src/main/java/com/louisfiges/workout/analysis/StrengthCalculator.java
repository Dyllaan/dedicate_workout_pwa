package com.louisfiges.workout.analysis;

import com.louisfiges.workout.dto.responses.StrengthEstimate;
import com.louisfiges.workout.util.MathUtils;
import org.springframework.stereotype.Component;

import java.text.DecimalFormat;

@Component
public class StrengthCalculator {

    DecimalFormat df = new DecimalFormat("#.00");

    private Double epleyFormula(Double weight, int reps) {
        return weight * (1 + reps / 30.0);
    }

    private Double bryzyckiFormula(Double weight, int reps) {
        return weight * (36.0 / (37 - reps));
    }

    private Double lombardiFormula(Double weight, int reps) {
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

    public double estimateOneRepMaxMedian(double weight, int reps) {
        double epley = epleyFormula(weight, reps);
        double bryzycki = bryzyckiFormula(weight, reps);
        double lombardi = lombardiFormula(weight, reps);
        return MathUtils.roundTo2Decimals(MathUtils.medianOfThree(epley, bryzycki, lombardi));
    }
}
