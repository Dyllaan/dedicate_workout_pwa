package com.louisfiges.workout.analysis;

/**
 * Simple linear regression implementation for analysing workout data.
 * Provides methods to fit a line to data points and make predictions.
 */

public class LinearRegression {

    private final double slope;
    private final double intercept;
    private final double rSquared;

    private LinearRegression(double slope, double intercept, double rSquared) {
        this.slope = slope;
        this.intercept = intercept;
        this.rSquared = rSquared;
    }

    public static LinearRegression fit(double[] x, double[] y) {
        if (x.length != y.length || x.length == 0) {
            throw new IllegalArgumentException("x and y must be non-empty and equal length");
        }

        int n = x.length;
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (int i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
        }

        double denominator = n * sumX2 - sumX * sumX;
        double slope = denominator == 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
        double meanY = sumY / n;
        double intercept = meanY - slope * (sumX / n);

        double ssTot = 0, ssRes = 0;
        for (int i = 0; i < n; i++) {
            double predicted = slope * x[i] + intercept;
            ssRes += Math.pow(y[i] - predicted, 2);
            ssTot += Math.pow(y[i] - meanY, 2);
        }
        double rSquared = ssTot == 0 ? 1.0 : 1.0 - (ssRes / ssTot);

        return new LinearRegression(slope, intercept, rSquared);
    }

    public double predict(double x) {
        return slope * x + intercept;
    }

    public double getSlope()     { return slope; }
    public double getIntercept() { return intercept; }
    public double getRSquared()  { return rSquared; }
}