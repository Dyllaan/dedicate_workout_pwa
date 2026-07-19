import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type DatumValue = string | number | null | undefined;

type SimpleLineChartSeries = {
  key: string;
  label: string;
  color: string;
  strokeWidth?: number;
  connectNulls?: boolean;
};

type SimpleLineChartReferenceLine = {
  value: number;
  color: string;
  dashArray?: string;
  opacity?: number;
};

type TooltipEntry = {
  key: string;
  label: string;
  color: string;
  value: number | null;
};

type SimpleLineChartProps<T extends object> = {
  data: T[];
  series: SimpleLineChartSeries[];
  xKey: keyof T & string;
  xLabelKey?: keyof T & string;
  activeSeriesKey?: string | null;
  secondarySeriesKey?: string | null;
  fillActiveSeries?: boolean;
  hideXAxisLabels?: boolean;
  className?: string;
  height?: number;
  minWidth?: number;
  domain?: [number, number];
  showDotsThreshold?: number;
  valueFormatter?: (value: number) => string;
  referenceLines?: SimpleLineChartReferenceLine[];
  tooltipRenderer?: (args: {
    datum: T;
    entries: TooltipEntry[];
    label: string;
  }) => React.ReactNode;
  onActiveDatumChange?: (args: { datum: T; label: string } | null) => void;
};

const VIEWBOX_WIDTH = 800;
const CHART_MARGIN = {
  top: 6,
  right: 16,
  bottom: 10,
  left: 58,
};

function asNumber(value: DatumValue) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toLabel(value: DatumValue) {
  return typeof value === "string" ? value : String(value ?? "");
}

function buildTickIndices(length: number, count: number) {
  if (length <= count) {
    return Array.from({ length }, (_, index) => index);
  }

  const lastIndex = length - 1;
  const indices = new Set<number>([0, lastIndex]);

  for (let step = 1; step < count - 1; step += 1) {
    indices.add(Math.round((step / (count - 1)) * lastIndex));
  }

  return [...indices].sort((left, right) => left - right);
}

function buildSeriesPath(
  data: Array<Record<string, DatumValue>>,
  key: string,
  connectNulls: boolean,
  getX: (index: number) => number,
  getY: (value: number) => number,
) {
  let hasPoint = false;
  let path = "";
  let canConnect = false;

  data.forEach((datum, index) => {
    const value = asNumber(datum[key]);

    if (value == null) {
      if (!connectNulls) {
        canConnect = false;
      }
      return;
    }

    const x = getX(index);
    const y = getY(value);

    if (!hasPoint || !canConnect) {
      path += `${path ? " " : ""}M ${x} ${y}`;
      hasPoint = true;
    } else {
      path += ` L ${x} ${y}`;
    }

    canConnect = true;
  });

  return path;
}

function buildAreaPath(
  data: Array<Record<string, DatumValue>>,
  key: string,
  getX: (index: number) => number,
  getY: (value: number) => number,
  baselineY: number,
) {
  const points = data.flatMap((datum, index) => {
    const value = asNumber(datum[key]);
    return value == null ? [] : [{ x: getX(index), y: getY(value) }];
  });

  if (points.length === 0) {
    return "";
  }

  const [firstPoint] = points;
  const lastPoint = points[points.length - 1];

  return [
    `M ${firstPoint.x} ${baselineY}`,
    `L ${firstPoint.x} ${firstPoint.y}`,
    ...points.slice(1).map((point) => `L ${point.x} ${point.y}`),
    `L ${lastPoint.x} ${baselineY}`,
    "Z",
  ].join(" ");
}

export default function SimpleLineChart<T extends object>({
  data,
  series,
  xKey,
  xLabelKey,
  activeSeriesKey,
  secondarySeriesKey,
  fillActiveSeries = false,
  hideXAxisLabels = false,
  className,
  height = 320,
  minWidth,
  domain,
  showDotsThreshold = 12,
  valueFormatter = (value) => value.toFixed(1),
  referenceLines = [],
  tooltipRenderer,
  onActiveDatumChange,
}: SimpleLineChartProps<T>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const normalizedData = data as Array<Record<string, DatumValue>>;
  const resolvedActiveSeriesKey =
    activeSeriesKey && series.some((item) => item.key === activeSeriesKey) ? activeSeriesKey : null;
  const resolvedSecondarySeriesKey =
    secondarySeriesKey &&
    secondarySeriesKey !== resolvedActiveSeriesKey &&
    series.some((item) => item.key === secondarySeriesKey)
      ? secondarySeriesKey
      : null;

  const chartHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const chartWidth = VIEWBOX_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;

  const { minValue, maxValue } = useMemo(() => {
    if (domain) {
      return { minValue: domain[0], maxValue: domain[1] };
    }

    const numericValues = [
      ...referenceLines.map((line) => line.value),
      ...normalizedData.flatMap((datum) => series.map((item) => asNumber(datum[item.key]))),
    ].filter((value): value is number => value != null);

    if (numericValues.length === 0) {
      return { minValue: 0, maxValue: 1 };
    }

    const rawMin = Math.min(...numericValues);
    const rawMax = Math.max(...numericValues);

    if (rawMin === rawMax) {
      const padding = Math.max(Math.abs(rawMin) * 0.12, 1);
      return {
        minValue: rawMin - padding,
        maxValue: rawMax + padding,
      };
    }

    const padding = (rawMax - rawMin) * 0.12;
    return {
      minValue: rawMin - padding,
      maxValue: rawMax + padding,
    };
  }, [domain, normalizedData, referenceLines, series]);

  const yRange = maxValue - minValue || 1;
  const yTicks = useMemo(() => {
    if (minValue === maxValue) {
      return [minValue];
    }

    return [maxValue, minValue];
  }, [maxValue, minValue]);
  const xTickIndices = useMemo(() => buildTickIndices(data.length, 3), [data.length]);

  const getX = (index: number) =>
    CHART_MARGIN.left + (data.length <= 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);

  const getY = (value: number) =>
    CHART_MARGIN.top + chartHeight - ((value - minValue) / yRange) * chartHeight;

  const hoveredDatum = hoveredIndex == null ? null : data[hoveredIndex] ?? null;
  const hoveredEntries =
    hoveredDatum == null
      ? []
      : series.map((item) => ({
          key: item.key,
          label: item.label,
          color: item.color,
          value: asNumber((hoveredDatum as Record<string, DatumValue>)[item.key]),
        }));

  const hoveredLabel =
    hoveredDatum == null ? "" : toLabel((hoveredDatum as Record<string, DatumValue>)[xLabelKey ?? xKey]);

  useEffect(() => {
    if (!onActiveDatumChange) {
      return;
    }

    if (hoveredDatum == null) {
      onActiveDatumChange(null);
      return;
    }

    onActiveDatumChange({
      datum: hoveredDatum,
      label: hoveredLabel,
    });
  }, [hoveredDatum, hoveredLabel, onActiveDatumChange]);

  function getSeriesPresentation(item: SimpleLineChartSeries) {
    const state =
      resolvedActiveSeriesKey == null
        ? "active"
        : item.key === resolvedActiveSeriesKey
          ? "active"
          : item.key === resolvedSecondarySeriesKey
            ? "compare"
            : "hidden";

    return {
      state,
      isActive: state === "active",
      opacity: state === "active" ? 1 : state === "compare" ? 0.28 : 0,
      strokeWidth:
        state === "active" ? (item.strokeWidth ?? 4.2) + 2.1 : state === "compare" ? 2.6 : 0,
      dotRadius: state === "active" ? 4.1 : state === "compare" ? 2.4 : 0,
      hoverRadius: state === "active" ? 6.2 : state === "compare" ? 3.4 : 0,
    };
  }

  return (
    <div
      className={cn("relative w-full select-none", className)}
      style={minWidth ? { minWidth: `${minWidth}px` } : undefined}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`} className="h-full w-full overflow-visible" role="img">
        {yTicks.map((tick, index) => (
          <g key={tick}>
            <line
              x1={CHART_MARGIN.left}
              y1={getY(tick)}
              x2={VIEWBOX_WIDTH - CHART_MARGIN.right}
              y2={getY(tick)}
              stroke="rgba(148,163,184,0.09)"
              strokeDasharray={index === 0 ? "0" : "2 4"}
            />
            <text
              x={CHART_MARGIN.left - 10}
              y={getY(tick) + 5}
              textAnchor="end"
              className="fill-foreground text-[24px] font-semibold"
              opacity={index === 0 ? "0.94" : "0.72"}
            >
              {valueFormatter(tick)}
            </text>
          </g>
        ))}

        {xTickIndices.map((index) => {
          const x = getX(index);

          return (
            <line
              key={`${xKey}-${index}`}
              x1={x}
              y1={CHART_MARGIN.top + chartHeight}
              x2={x}
              y2={CHART_MARGIN.top + chartHeight + 5}
              style={{ stroke: "var(--muted-foreground)" }}
              opacity={hideXAxisLabels ? "0.22" : "0.16"}
            />
          );
        })}

        {!hideXAxisLabels &&
          xTickIndices.map((index) => {
            const x = getX(index);
            const textAnchor = index === 0 ? "start" : index === data.length - 1 ? "end" : "middle";

            return (
              <text
                key={`${xKey}-${index}-label`}
                x={x}
                y={height - 10}
                textAnchor={textAnchor}
                className="fill-muted-foreground text-[16px] font-semibold"
                opacity="0.78"
              >
                {toLabel(normalizedData[index]?.[xLabelKey ?? xKey])}
              </text>
            );
          })}

        {referenceLines.map((line) => (
          <line
            key={`${line.color}-${line.value}`}
            x1={CHART_MARGIN.left}
            y1={getY(line.value)}
            x2={VIEWBOX_WIDTH - CHART_MARGIN.right}
            y2={getY(line.value)}
            stroke={line.color}
            strokeDasharray={line.dashArray ?? "4 2"}
            opacity={line.opacity ?? 0.35}
          />
        ))}

        {series.map((item) => {
          const presentation = getSeriesPresentation(item);
          if (!fillActiveSeries || presentation.state !== "active") {
            return null;
          }

          const areaPath = buildAreaPath(
            normalizedData,
            item.key,
            getX,
            getY,
            CHART_MARGIN.top + chartHeight,
          );

          if (!areaPath) {
            return null;
          }

          return (
            <path
              key={`area-${item.key}`}
              d={areaPath}
              fill={item.color}
              opacity="0.12"
              data-area-series-key={item.key}
            />
          );
        })}

        {series.map((item) => {
          const path = buildSeriesPath(normalizedData, item.key, item.connectNulls ?? true, getX, getY);
          const presentation = getSeriesPresentation(item);

          if (!path || presentation.state === "hidden") {
            return null;
          }

          return (
            <path
              key={item.key}
              d={path}
              fill="none"
              stroke={item.color}
              strokeWidth={presentation.strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={presentation.opacity}
              data-line-series-key={item.key}
              data-line-series-state={presentation.state}
            />
          );
        })}

        {data.length <= showDotsThreshold &&
          series.flatMap((item) =>
            normalizedData.map((datum, index) => {
              const value = asNumber(datum[item.key]);
              const presentation = getSeriesPresentation(item);
              if (value == null || presentation.state === "hidden") {
                return null;
              }

              return (
                <circle
                  key={`${item.key}-${index}`}
                  cx={getX(index)}
                  cy={getY(value)}
                  r={presentation.dotRadius}
                  fill={item.color}
                  opacity={presentation.opacity}
                />
              );
            }),
          )}

        {hoveredIndex != null && hoveredDatum != null && (
          <>
            <line
              x1={getX(hoveredIndex)}
              y1={CHART_MARGIN.top}
              x2={getX(hoveredIndex)}
              y2={CHART_MARGIN.top + chartHeight}
              style={{ stroke: "var(--muted-foreground)" }}
              opacity="0.26"
              strokeDasharray="2 5"
            />
            {hoveredEntries.map((item) => {
              const presentation = getSeriesPresentation(series.find((seriesItem) => seriesItem.key === item.key) ?? {
                key: item.key,
                label: item.label,
                color: item.color,
              });
              if (item.value == null || presentation.state === "hidden") {
                return null;
              }

              return (
                <circle
                  key={`hover-${item.key}`}
                  cx={getX(hoveredIndex)}
                  cy={getY(item.value)}
                  r={presentation.hoverRadius}
                  fill={item.color}
                  stroke="var(--background)"
                  strokeWidth={1.75}
                  opacity={presentation.state === "active" ? 1 : 0.72}
                />
              );
            })}
          </>
        )}
      </svg>

      {data.length > 0 && (
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))`, touchAction: "none" }}
          onTouchMove={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
            const button = target?.closest("button");
            if (!button) return;
            const children = Array.from(button.parentElement?.children ?? []);
            const index = children.indexOf(button);
            if (index >= 0 && index < data.length) {
              setHoveredIndex(index);
            }
          }}
          onTouchEnd={() => setHoveredIndex(null)}
        >
          {normalizedData.map((datum, index) => (
            <button
              key={`${toLabel(datum[xKey])}-${index}`}
              type="button"
              className="h-full w-full bg-transparent"
              aria-label={toLabel(datum[xLabelKey ?? xKey])}
              onMouseEnter={() => setHoveredIndex(index)}
              onFocus={() => setHoveredIndex(index)}
              onTouchStart={(event) => {
                event.preventDefault();
                setHoveredIndex(index);
              }}
            />
          ))}
        </div>
      )}

      {hoveredDatum != null && hoveredEntries.some((entry) => entry.value != null) && (
        <div
          className="pointer-events-none absolute left-2 top-2 z-10 min-w-[11rem] rounded-xl border border-border/85 bg-background/97 px-3.5 py-3 text-base backdrop-blur-sm"
        >
          {tooltipRenderer ? (
            tooltipRenderer({
              datum: hoveredDatum,
              entries: hoveredEntries,
              label: hoveredLabel,
            })
          ) : (
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-muted-foreground">{hoveredLabel}</p>
              {hoveredEntries
                .filter((entry) => entry.value != null)
                .map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[14px] font-semibold">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.label}
                    </span>
                    <span className="text-[18px] font-semibold text-foreground">
                      {valueFormatter(entry.value ?? 0)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
