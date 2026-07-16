import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DatumValue = string | number | null | undefined;

type SimpleBarChartDatum<T extends object> = {
  label: string;
  value: number;
  source: T;
};

type SimpleBarChartProps<T extends object> = {
  data: T[];
  labelKey: keyof T & string;
  valueKey: keyof T & string;
  className?: string;
  height?: number;
  rowHeight?: number;
  valueFormatter?: (value: number) => string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  tooltipRenderer?: (args: {
    datum: T;
    label: string;
    value: number;
  }) => ReactNode;
  onActiveDatumChange?: (
    args: {
      datum: T;
      label: string;
      value: number;
    } | null,
  ) => void;
  barColor?: string;
  seriesLabel?: string;
};

const DEFAULT_HEIGHT = 280;
const DEFAULT_ROW_HEIGHT = 36;
const MIN_RENDER_WIDTH = 360;
const DEFAULT_RENDER_WIDTH = 640;
const LEFT_PADDING = 18;
const RIGHT_PADDING = 18;
const TOP_PADDING = 18;
const BOTTOM_PADDING = 18;
const AXIS_HEIGHT = 28;

function asNumber(value: DatumValue) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toLabel(value: DatumValue) {
  return typeof value === "string" ? value : String(value ?? "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTick(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

function buildTicks(min: number, max: number, count: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }

  if (count <= 1 || min === max) {
    return [min];
  }

  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function getDomain(values: number[]) {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return { min: 0, max: 1 };
  }

  if (minValue === maxValue) {
    if (minValue === 0) {
      return { min: 0, max: 1 };
    }

    return minValue > 0 ? { min: 0, max: maxValue } : { min: minValue, max: 0 };
  }

  return {
    min: Math.min(0, minValue),
    max: Math.max(0, maxValue),
  };
}

function estimateTextWidth(text: string, minimum: number, maximum: number) {
  const estimated = Math.ceil(text.length * 7.25) + 8;
  return clamp(estimated, minimum, maximum);
}

function DefaultTooltip<T extends object>({
  seriesLabel,
  valueFormatter,
  datum,
  label,
  value,
}: {
  seriesLabel: string;
  valueFormatter: (value: number) => string;
  datum: T;
  label: string;
  value: number;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-semibold text-foreground">{seriesLabel}</span>
        <span className="text-[18px] font-semibold text-foreground">{valueFormatter(value)}</span>
      </div>
      <span className="sr-only">{JSON.stringify(datum)}</span>
    </div>
  );
}

export default function SimpleBarChart<T extends object>({
  data,
  labelKey,
  valueKey,
  className,
  height = DEFAULT_HEIGHT,
  rowHeight = DEFAULT_ROW_HEIGHT,
  valueFormatter = (value) => value.toFixed(1),
  xAxisLabel = "Weight",
  yAxisLabel = "Date",
  tooltipRenderer,
  onActiveDatumChange,
  barColor = "#6366f1",
  seriesLabel = "Value",
}: SimpleBarChartProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo<SimpleBarChartDatum<T>[]>(() => {
    return data.flatMap((datum) => {
      const value = asNumber((datum as Record<string, DatumValue>)[valueKey]);

      if (value == null) {
        return [];
      }

      return [
        {
          label: toLabel((datum as Record<string, DatumValue>)[labelKey]),
          value,
          source: datum,
        },
      ];
    });
  }, [data, labelKey, valueKey]);

  const surfaceHeight = Math.max(height, chartData.length * rowHeight + TOP_PADDING + BOTTOM_PADDING + AXIS_HEIGHT);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const update = () => {
      setContainerWidth(element.clientWidth);
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      update();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeIndex == null) {
      return;
    }

    if (activeIndex >= chartData.length) {
      setActiveIndex(null);
      onActiveDatumChange?.(null);
    }
  }, [activeIndex, chartData.length, onActiveDatumChange]);

  const activeDatum = activeIndex != null ? chartData[activeIndex] ?? null : null;

  const availableWidth = Math.max(containerWidth || DEFAULT_RENDER_WIDTH, MIN_RENDER_WIDTH);
  const plotWidth = Math.max(availableWidth - LEFT_PADDING - RIGHT_PADDING, 120);

  const values = chartData.map((datum) => datum.value);
  const { min: domainMin, max: domainMax } = getDomain(values);
  const domainSpan = Math.max(domainMax - domainMin, 1);

  const xScale = (value: number) => ((value - domainMin) / domainSpan) * plotWidth;
  const zeroX = xScale(0);
  const ticks = buildTicks(domainMin, domainMax, 5);
  const barHeight = Math.max(Math.min(34, rowHeight * 0.82), 16);
  const chartBottom = surfaceHeight - BOTTOM_PADDING - AXIS_HEIGHT;
  const barLabelPadding = 10;

  const activateDatum = (index: number) => {
    const next = chartData[index];

    if (!next) {
      return;
    }

    setActiveIndex(index);
    onActiveDatumChange?.({
      datum: next.source,
      label: next.label,
      value: next.value,
    });
  };

  const clearDatum = () => {
    setActiveIndex(null);
    onActiveDatumChange?.(null);
  };

  if (chartData.length === 0) {
    return (
      <div className={cn("relative select-none", className)} style={{ height }} data-testid="simple-bar-chart-surface" />
    );
  }

  return (
    <div className={cn("relative select-none", className)} style={{ height }} ref={containerRef}>
      <div className="h-full overflow-auto">
        <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[12px]">
          <span>{yAxisLabel}</span>
          <span>{xAxisLabel}</span>
        </div>
        <div className="relative min-w-full" style={{ height: surfaceHeight, minWidth: "100%" }} data-testid="simple-bar-chart-surface">
          <svg
            aria-label={seriesLabel}
            className="block h-full w-full"
            role="img"
            viewBox={`0 0 ${availableWidth} ${surfaceHeight}`}
            preserveAspectRatio="none"
          >
            <rect x={0} y={0} width={availableWidth} height={surfaceHeight} fill="transparent" />

            <g transform={`translate(${LEFT_PADDING}, ${TOP_PADDING})`}>
              {ticks.map((tick) => {
                const x = xScale(tick);

                return (
                  <g key={tick}>
                    <line
                      x1={x}
                      x2={x}
                      y1={0}
                      y2={chartBottom - TOP_PADDING}
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.45}
                    />
                    <text
                      x={x}
                      y={chartBottom - TOP_PADDING + 18}
                      fill="hsl(var(--muted-foreground))"
                      className="text-[11px] sm:text-[12px]"
                      textAnchor="middle"
                    >
                      {formatTick(tick)}
                    </text>
                  </g>
                );
              })}

              <line
                x1={zeroX}
                x2={zeroX}
                y1={0}
                y2={chartBottom - TOP_PADDING}
                stroke="hsl(var(--foreground))"
                strokeOpacity={0.16}
              />

              {chartData.map((datum, index) => {
                const y = index * rowHeight + Math.max((rowHeight - barHeight) / 2, 0);
                const valueX = xScale(datum.value);
                const barX = datum.value >= 0 ? zeroX : valueX;
                const barWidth = Math.max(Math.abs(valueX - zeroX), 1);
                const isActive = activeIndex == null ? true : activeIndex === index;
                const opacity = activeIndex == null ? 0.92 : isActive ? 1 : 0.38;

                return (
                  <g key={`${datum.label}-${index}`}>
                    <rect
                      x={barX}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={6}
                      fill={barColor}
                      opacity={opacity}
                      onMouseEnter={() => activateDatum(index)}
                      onFocus={() => activateDatum(index)}
                      onMouseLeave={clearDatum}
                      tabIndex={0}
                      role="img"
                      aria-label={`${datum.label}: ${valueFormatter(datum.value)}`}
                    />
                    {(() => {
                      const barText = `${datum.label} · ${valueFormatter(datum.value)}`;
                      const barTextWidth = estimateTextWidth(barText, 84, 280);
                      const fitsInside = barWidth >= barTextWidth + barLabelPadding * 2;
                      const textX = datum.value >= 0
                        ? fitsInside
                          ? barX + barWidth - barLabelPadding
                          : barX + barWidth + barLabelPadding
                        : fitsInside
                          ? barX + barLabelPadding
                          : barX - barLabelPadding;
                      const textAnchor = datum.value >= 0 ? (fitsInside ? "end" : "start") : (fitsInside ? "start" : "end");
                      const textFill = fitsInside ? "white" : "hsl(var(--foreground))";

                      return (
                        <text
                          x={textX}
                          y={y + barHeight / 2 + 5}
                          fill={textFill}
                          className="text-[13px] font-semibold sm:text-[14px]"
                          fontWeight={600}
                          textAnchor={textAnchor}
                          opacity={opacity}
                          paintOrder="stroke"
                          stroke={fitsInside ? "rgba(0,0,0,0.15)" : "transparent"}
                          strokeWidth={fitsInside ? 3 : 0}
                        >
                          {barText}
                        </text>
                      );
                    })()}
                  </g>
                );
              })}
            </g>
          </svg>

          {activeDatum != null && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 w-[190px] rounded-xl border border-border/85 bg-background/97 px-3.5 py-3 text-sm shadow-lg backdrop-blur-sm">
              {tooltipRenderer ? (
                tooltipRenderer({
                  datum: activeDatum.source,
                  label: activeDatum.label,
                  value: activeDatum.value,
                })
              ) : (
                <DefaultTooltip
                  seriesLabel={seriesLabel}
                  valueFormatter={valueFormatter}
                  datum={activeDatum.source}
                  label={activeDatum.label}
                  value={activeDatum.value}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
