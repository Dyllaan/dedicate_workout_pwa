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

  describe("workouts pagination branches", () => {
    it("workouts.entries with templateId and both page/size", () => {
      expect(queryKeys.workouts.entries("t1", 0, 10)).toEqual(["workout-entries", "t1", 0, 10]);
    });

    it("workouts.entries with pagination but no templateId", () => {
      expect(queryKeys.workouts.entries(undefined, 0, 10)).toEqual(["workout-entries", 0, 10]);
    });

    it("workouts.all with pagination", () => {
      expect(queryKeys.workouts.all(0, 10)).toEqual(["workouts", 0, 10]);
    });
  });

  describe("splits pagination", () => {
    it("splits.all with pagination", () => {
      expect(queryKeys.splits.all(0, 10)).toEqual(["splits", 0, 10]);
    });
  });

  describe("programmes pagination", () => {
    it("programmes.bySplit with pagination", () => {
      expect(queryKeys.programmes.bySplit("s1", 0, 10)).toEqual(["programmes", "s1", 0, 10]);
    });
  });

  describe("exerciseDefinitions", () => {
    it("exerciseDefinitions.all with pagination", () => {
      expect(queryKeys.exerciseDefinitions.all(0, 10)).toEqual(["exercise-definitions", 0, 10, ""]);
    });

    it("exerciseDefinitions.all with pagination and query", () => {
      expect(queryKeys.exerciseDefinitions.all(0, 10, "bench"))
        .toEqual(["exercise-definitions", 0, 10, "bench"]);
    });

    it("exerciseDefinitions.all with query only", () => {
      expect(queryKeys.exerciseDefinitions.all(undefined, undefined, "bench"))
        .toEqual(["exercise-definitions", "bench"]);
    });

    it("exerciseDefinitions.history with all params", () => {
      expect(queryKeys.exerciseDefinitions.history("def-1", 5, "2024-01-01", "2024-12-31"))
        .toEqual(["exercise-definitions", "def-1", "history", 5, "2024-01-01", "2024-12-31"]);
    });
  });

  describe("progress pagination", () => {
    it("progress.catalog with pagination", () => {
      expect(queryKeys.progress.catalog(0, 10)).toEqual(["progress", "catalog", 0, 10]);
    });

    it("progress.presets with pagination", () => {
      expect(queryKeys.progress.presets(0, 10)).toEqual(["progress", "presets", 0, 10]);
    });
  });

  describe("insights factories", () => {
    it("insights.liftSummary with overall scope", () => {
      expect(queryKeys.insights.liftSummary("overall"))
        .toEqual(["training-insights", "lift-summary", "overall", ""]);
    });

    it("insights.liftSummary with template scope and id", () => {
      expect(queryKeys.insights.liftSummary("template", "tpl-1"))
        .toEqual(["training-insights", "lift-summary", "template", "tpl-1"]);
    });

    it("insights.signals with pagination", () => {
      expect(queryKeys.insights.signals(0, 10)).toEqual(["training-insights", "signals", 0, 10]);
    });

    it("insights.dismissals with pagination", () => {
      expect(queryKeys.insights.dismissals(0, 10)).toEqual(["training-insights", "dismissals", 0, 10]);
    });

  });

  describe("analysis", () => {
    it("analysis.recommendation with all params", () => {
      expect(queryKeys.analysis.recommendation("tpl-1", 5, "2024-01-01", "2024-12-31"))
        .toEqual(["analysis", "recommendation", "tpl-1", 5, "2024-01-01", "2024-12-31"]);
    });
  });

  describe("readiness", () => {
    it("readiness.history with pagination", () => {
      expect(queryKeys.readiness.history(7, 0, 10)).toEqual(["readiness", "history", 7, 0, 10]);
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
