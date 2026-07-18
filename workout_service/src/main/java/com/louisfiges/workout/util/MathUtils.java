package com.louisfiges.workout.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MathUtils {

    private MathUtils() {
    }

    public static double medianOfThree(double a, double b, double c) {
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }

    public static double roundTo2Decimals(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    public static double roundTo1Decimal(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
