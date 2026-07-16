import type { ProgressChartPresetRequest } from "@/types/Progress";

const PREFIX = "progress_chart_config_";

export function loadChartConfig(
  exerciseKey: string,
): Partial<ProgressChartPresetRequest> | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${exerciseKey}`);
    return raw ? (JSON.parse(raw) as Partial<ProgressChartPresetRequest>) : null;
  } catch {
    return null;
  }
}

export function saveChartConfig(
  exerciseKey: string,
  config: Partial<ProgressChartPresetRequest>,
): void {
  try {
    localStorage.setItem(`${PREFIX}${exerciseKey}`, JSON.stringify(config));
  } catch {
    // localStorage unavailable in private mode or quota exceeded
  }
}
