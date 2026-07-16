import { describe, expect, it } from "vitest";
import {
  calculatePowerToWeightRatios,
  findBodyweightLogForDate,
  formatPowerToWeightRatio,
} from "@/utils/powerToWeightRatio";
import { buildBodyweightLog } from "tests/shared/builders";

describe("powerToWeightRatio", () => {
  it("calculates rounded load and estimated 1RM bodyweight ratios", () => {
    expect(
      calculatePowerToWeightRatios({
        loadKg: 105,
        estimatedOneRepMaxKg: 122.5,
        bodyweightKg: 80,
      }),
    ).toEqual({
      loadBodyweightRatio: 1.31,
      estimatedOneRepMaxBodyweightRatio: 1.53,
    });
  });

  it("returns null ratios when bodyweight is missing or invalid", () => {
    expect(
      calculatePowerToWeightRatios({
        loadKg: 105,
        estimatedOneRepMaxKg: 122.5,
        bodyweightKg: null,
      }),
    ).toEqual({
      loadBodyweightRatio: null,
      estimatedOneRepMaxBodyweightRatio: null,
    });
  });

  it("finds the latest bodyweight logged on or before the lift date", () => {
    const logs = [
      buildBodyweightLog({ weightKg: 82, loggedAt: "2026-05-12" }),
      buildBodyweightLog({ weightKg: 80, loggedAt: "2026-05-09" }),
      buildBodyweightLog({ weightKg: 79, loggedAt: "2026-05-01" }),
    ];

    expect(findBodyweightLogForDate(logs, "2026-05-10T12:00:00.000Z")?.weightKg).toBe(80);
  });

  it("formats ratios with two decimals and an x suffix", () => {
    expect(formatPowerToWeightRatio(1.3)).toBe("1.30x");
    expect(formatPowerToWeightRatio(null)).toBe("Unavailable");
  });
});
