import { describe, it, expect } from "vitest";
import {
  toDisplayWeight,
  toStorageKg,
  formatWeight,
  weightStep,
  KG_TO_LBS,
} from "@/utils/unitConversion";

describe("toDisplayWeight", () => {
  it("returns kg unchanged", () => {
    expect(toDisplayWeight(100, "kg")).toBe(100);
  });

  it("converts kg to lbs rounded to 1 decimal", () => {
    expect(toDisplayWeight(100, "lbs")).toBe(220.5);
  });

  it("converts 0 correctly", () => {
    expect(toDisplayWeight(0, "lbs")).toBe(0);
  });
});

describe("toStorageKg", () => {
  it("returns lbs display unchanged for kg unit", () => {
    expect(toStorageKg(100, "kg")).toBe(100);
  });

  it("converts lbs to kg rounded to 2 decimal places", () => {
    const result = toStorageKg(220, "lbs");
    expect(result).toBeCloseTo(220 / KG_TO_LBS, 1);
    expect(result).toBeCloseTo(99.79, 1);
  });
});

describe("round-trip conversion", () => {
  it("kg â†’ lbs â†’ kg is within 0.01 kg", () => {
    const original = 102.5;
    const lbs = toDisplayWeight(original, "lbs");
    const backToKg = toStorageKg(lbs, "lbs");
    expect(Math.abs(backToKg - original)).toBeLessThan(0.05);
  });
});

describe("formatWeight", () => {
  it("formats kg with unit label", () => {
    expect(formatWeight(100, "kg")).toBe("100.00 kg");
  });

  it("formats lbs with unit label", () => {
    expect(formatWeight(100, "lbs")).toBe("220.5 lbs");
  });

  it("formats heavy weights as tonnes in kg mode", () => {
    expect(formatWeight(1000, "kg")).toBe("1.00t");
  });
});

describe("weightStep", () => {
  it("returns 2.5 for kg", () => {
    expect(weightStep("kg")).toBe(2.5);
  });

  it("returns 5 for lbs", () => {
    expect(weightStep("lbs")).toBe(5);
  });
});
