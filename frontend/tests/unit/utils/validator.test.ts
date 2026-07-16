import { describe, expect, it } from "vitest";
import {
  getStringValidationIssues,
  getStringValidationMessage,
  isInvalidString,
} from "@/utils/validator";

describe("validator string helpers", () => {
  it("flags short strings with a specific reason", () => {
    expect(getStringValidationIssues("Ab")).toContain("too_short");
    expect(getStringValidationMessage("Workout name", "Ab")).toContain(
      "at least",
    );
    expect(isInvalidString("Ab")).toBe(true);
  });

  it("reports whitespace and character problems together", () => {
    expect(getStringValidationIssues(" #")).toEqual(
      expect.arrayContaining([
        "leading_or_trailing_whitespace",
        "too_short",
        "invalid_characters",
      ]),
    );
    expect(getStringValidationMessage("Exercise name", " #")).toContain(
      "not start or end with whitespace",
    );
    expect(getStringValidationMessage("Exercise name", " #")).toContain(
      "contain only letters, numbers, spaces, and common punctuation",
    );
  });
});
