export type AccentColor = "emerald" | "amber" | "danger";

const GRADIENT_MAP: Record<AccentColor, string> = {
    emerald: "from-emerald-600 via-teal-500 to-emerald-800 dark:from-emerald-700 dark:via-blue-500 dark:to-emerald-950/40",
    amber: "from-amber-500 via-orange-400 to-amber-700 dark:from-amber-600 dark:to-amber-950/40",
    danger: "from-red-500 via-rose-400 to-red-700 dark:from-destructive dark:to-red-950/40",
};

const ICON_COLOR_MAP: Record<AccentColor, string> = {
    emerald: "#059669", // emerald-600
    amber: "#d97706",   // amber-600
    danger: "#dc2626",  // red-600
};

const DEFAULT_GRADIENT = "from-border via-muted/50 to-border";

export function useAccentStyle(accentColor: AccentColor) {
    const gradientColors = GRADIENT_MAP[accentColor] || DEFAULT_GRADIENT;
    const iconStroke = ICON_COLOR_MAP[accentColor];

    return { gradientColors, iconStroke };
}