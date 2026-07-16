import { queryKeys } from "@/api/queryKeys";

describe("queryKeys", () => {
  describe("workouts", () => {
    it("workouts.all returns stable array", () => {
      expect(queryKeys.workouts.all()).toEqual(["workouts"]);
    });

    it("workouts.detail includes id", () => {
      expect(queryKeys.workouts.detail("abc")).toEqual(["workouts", "abc"]);
    });

    it("workouts.entries without templateId", () => {
      expect(queryKeys.workouts.entries()).toEqual(["workout-entries"]);
    });

    it("workouts.entries with templateId", () => {
      expect(queryKeys.workouts.entries("t1")).toEqual(["workout-entries", "t1"]);
    });

    it("workouts.entry includes id", () => {
      expect(queryKeys.workouts.entry("e1")).toEqual(["workout-entry", "e1"]);
    });
  });

  describe("splits", () => {
    it("splits.all", () => {
      expect(queryKeys.splits.all()).toEqual(["splits"]);
    });

    it("splits.detail includes id", () => {
      expect(queryKeys.splits.detail("s1")).toEqual(["splits", "s1"]);
    });
  });

  describe("programmes", () => {
    it("programmes.bySplit", () => {
      expect(queryKeys.programmes.bySplit("s1")).toEqual(["programmes", "s1"]);
    });
  });

  describe("progress", () => {
    it("progress.catalog", () => {
      expect(queryKeys.progress.catalog()).toEqual(["progress", "catalog"]);
    });

    it("progress.presets", () => {
      expect(queryKeys.progress.presets()).toEqual(["progress", "presets"]);
    });
  });

  describe("insights", () => {
    it("insights.overview", () => {
      expect(queryKeys.insights.overview()).toEqual(["training-insights", "overview"]);
    });

    it("insights.all", () => {
      expect(queryKeys.insights.all()).toEqual(["training-insights"]);
    });
  });

  describe("heatmap", () => {
    it("heatmap.all", () => {
      expect(queryKeys.heatmap.all()).toEqual(["muscle-heatmap"]);
    });

    it("heatmap.template includes id", () => {
      expect(queryKeys.heatmap.template("t1")).toEqual(["muscle-heatmap", "template", "t1"]);
    });

    it("heatmap.entry includes id", () => {
      expect(queryKeys.heatmap.entry("e1")).toEqual(["muscle-heatmap", "entry", "e1"]);
    });
  });

  describe("STALE", () => {
    it("STALE.navigation is 5 minutes in ms", () => {
      expect(queryKeys.STALE.navigation).toBe(5 * 60 * 1000);
    });

    it("STALE.dashboard is 2 minutes in ms", () => {
      expect(queryKeys.STALE.dashboard).toBe(2 * 60 * 1000);
    });
  });
});
