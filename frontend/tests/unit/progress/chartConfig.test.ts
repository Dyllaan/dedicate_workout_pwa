import { loadChartConfig, saveChartConfig } from "@/hooks/progress/chartConfig";

beforeEach(() => {
  localStorage.clear();
});

describe("saveChartConfig / loadChartConfig", () => {
  it("returns null when nothing has been saved", () => {
    expect(loadChartConfig("Low Row||")).toBeNull();
  });

  it("round-trips a config object", () => {
    const config = { metric: "BEST_SET_E1RM" as const, dateRangePreset: "90D" as const };
    saveChartConfig("Low Row||", config);
    expect(loadChartConfig("Low Row||")).toEqual(config);
  });

  it("isolates configs by key", () => {
    saveChartConfig("Bench Press||", { metric: "MAX_WEIGHT" as const });
    expect(loadChartConfig("Low Row||")).toBeNull();
  });

  it("returns null and does not throw on corrupted storage", () => {
    localStorage.setItem("progress_chart_config_Bad||", "not-json{{");
    expect(() => loadChartConfig("Bad||")).not.toThrow();
    expect(loadChartConfig("Bad||")).toBeNull();
  });
});
