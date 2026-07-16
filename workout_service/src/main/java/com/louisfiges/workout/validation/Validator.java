package com.louisfiges.workout.validation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Validator {

    private final int minStringLength;
    private final int maxStringLength;

    public Validator(
            @Value("${min.string.length}") int minStringLength,
            @Value("${max.string.length}") int maxStringLength
    ) {
        this.minStringLength = minStringLength;
        this.maxStringLength = maxStringLength;
    }

    public boolean isInvalidString(String str) {
        if (minStringLength < 0 || maxStringLength < minStringLength) {
            throw new IllegalStateException("Invalid validator configuration");
        }

        return !getStringValidationIssues(str).isEmpty();
    }

    public List<String> getStringValidationIssues(String str) {
        if (minStringLength < 0 || maxStringLength < minStringLength) {
            throw new IllegalStateException("Invalid validator configuration");
        }

        List<String> issues = new ArrayList<>();

        if (str.isEmpty()) {
            issues.add("required");
            return List.copyOf(issues);
        }

        if (!str.equals(str.trim())) {
            issues.add("leading_or_trailing_whitespace");
        }

        int length = str.length();
        if (length < minStringLength) {
            issues.add("too_short");
        } else if (length > maxStringLength) {
            issues.add("too_long");
        }

        String regex = "^[\\p{L}\\p{N}\\s\\-_'()&.,!?]+$";
        if (!str.matches(regex)) {
            issues.add("invalid_characters");
        }

        return List.copyOf(issues);
    }

    public String getStringValidationMessage(String label, String str) {
        List<String> issues = getStringValidationIssues(str);
        if (issues.isEmpty()) {
            return null;
        }

        if (issues.size() == 1 && "required".equals(issues.getFirst())) {
            return label + " is required";
        }

        List<String> clauses = issues.stream()
                .map(this::describeStringValidationIssue)
                .toList();
        if (clauses.size() == 1) {
            return label + " must " + clauses.getFirst();
        }

        if (clauses.size() == 2) {
            return label + " must " + clauses.getFirst() + " and " + clauses.getLast();
        }

        return label + " must " + String.join(", ", clauses.subList(0, clauses.size() - 1))
                + ", and " + clauses.getLast();
    }

    private String describeStringValidationIssue(String issue) {
        return switch (issue) {
            case "too_short" -> "be at least " + minStringLength + " characters long";
            case "too_long" -> "be at most " + maxStringLength + " characters long";
            case "leading_or_trailing_whitespace" -> "not start or end with whitespace";
            case "invalid_characters" -> "contain only letters, numbers, spaces, and common punctuation";
            default -> throw new IllegalArgumentException("Unknown string validation issue: " + issue);
        };
    }
}
