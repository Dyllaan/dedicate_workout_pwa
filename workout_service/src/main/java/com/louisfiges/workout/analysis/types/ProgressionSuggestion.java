package com.louisfiges.workout.analysis.types;

public class ProgressionSuggestion {
    private final SuggestionType type;
    private final double suggestedWeightKg;
    private final String reasoning;

    private ProgressionSuggestion(SuggestionType type, double suggestedWeightKg, String reasoning) {
        this.type = type;
        this.suggestedWeightKg = suggestedWeightKg;
        this.reasoning = reasoning;
    }

    public static ProgressionSuggestion increase(double weight, String reason) {
        return new ProgressionSuggestion(SuggestionType.INCREASE, weight, reason);
    }

    public static ProgressionSuggestion maintain(double weight, String reason) {
        return new ProgressionSuggestion(SuggestionType.MAINTAIN, weight, reason);
    }

    public static ProgressionSuggestion deload(double weight, String reason) {
        return new ProgressionSuggestion(SuggestionType.DELOAD, weight, reason);
    }

    public static ProgressionSuggestion plateau(double weight, String reason) {
        return new ProgressionSuggestion(SuggestionType.PLATEAU, weight, reason);
    }

    public static ProgressionSuggestion insufficient(String reason) {
        return new ProgressionSuggestion(SuggestionType.INSUFFICIENT_DATA, 0, reason);
    }

    public SuggestionType getType() { return type; }
    public double getSuggestedWeightKg() { return suggestedWeightKg; }
    public String getReasoning() { return reasoning; }

    @Override
    public String toString() {
        return String.format("ProgressionSuggestion{type=%s, weight=%.1fkg, reasoning='%s'}",
                type, suggestedWeightKg, reasoning);
    }
}