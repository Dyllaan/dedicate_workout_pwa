import { fireEvent, render, screen } from "@testing-library/react";
import SimpleLineChart from "@/components/charts/SimpleLineChart";

describe("SimpleLineChart", () => {
  it("renders series labels and values through the hover overlay", async () => {
    const activeDatumChange = vi.fn();
    const { container } = render(
      <SimpleLineChart
        data={[
          { timestamp: "2026-04-01T00:00:00.000Z", label: "1 Apr 26", bench: 100, squat: 150 },
          { timestamp: "2026-04-08T00:00:00.000Z", label: "8 Apr 26", bench: 102.5, squat: 152.5 },
        ]}
        series={[
          { key: "bench", label: "Bench", color: "#2563eb" },
          { key: "squat", label: "Squat", color: "#16a34a" },
        ]}
        xKey="timestamp"
        xLabelKey="label"
        hideXAxisLabels
        onActiveDatumChange={activeDatumChange}
        valueFormatter={(value) => `${value.toFixed(1)}kg`}
      />,
    );

    const axisLabels = Array.from(container.querySelectorAll("text")).filter((element) =>
      element.classList.contains("text-[15px]"),
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.queryByText("1 Apr 26")).not.toBeInTheDocument();
    expect(screen.queryByText("8 Apr 26")).not.toBeInTheDocument();
    expect(axisLabels.length).toBeGreaterThan(0);

    fireEvent.focus(screen.getByRole("button", { name: "8 Apr 26" }));

    expect(await screen.findByText("Bench")).toBeInTheDocument();
    expect(screen.getByText("Squat")).toBeInTheDocument();
    expect(screen.getByText("102.5kg")).toBeInTheDocument();
    expect(screen.getByText("152.5kg")).toBeInTheDocument();
    expect(screen.getByText("102.5kg").closest("span")).toHaveClass("text-[18px]");
    expect(activeDatumChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        label: "8 Apr 26",
      }),
    );
  });

  it("renders a reference line and custom tooltip content", async () => {
    render(
      <SimpleLineChart
        data={[{ date: "24 Apr", maxWeight: 120 }]}
        series={[{ key: "maxWeight", label: "Bench Press", color: "#6366f1" }]}
        xKey="date"
        referenceLines={[{ value: 120, color: "#6366f1" }]}
        tooltipRenderer={({ label }) => <div>{label} tooltip</div>}
      />,
    );

    fireEvent.focus(screen.getByRole("button", { name: "24 Apr" }));

    expect(await screen.findByText("24 Apr tooltip")).toBeInTheDocument();
  });

  it("renders an active series, one comparison series, and hides the rest", async () => {
    const { container } = render(
      <SimpleLineChart
        data={[
          { timestamp: "2026-04-01T00:00:00.000Z", label: "1 Apr 26", bench: 100, squat: 150, press: 65 },
          { timestamp: "2026-04-08T00:00:00.000Z", label: "8 Apr 26", bench: 102.5, squat: 152.5, press: 66 },
        ]}
        series={[
          { key: "bench", label: "Bench", color: "#2563eb" },
          { key: "squat", label: "Squat", color: "#16a34a" },
          { key: "press", label: "Press", color: "#f97316" },
        ]}
        xKey="timestamp"
        xLabelKey="label"
        activeSeriesKey="bench"
        secondarySeriesKey="squat"
        fillActiveSeries
      />,
    );

    const activeLine = container.querySelector('path[data-line-series-key="bench"]');
    const compareLine = container.querySelector('path[data-line-series-key="squat"]');
    const hiddenLine = container.querySelector('path[data-line-series-key="press"]');

    expect(activeLine).toHaveAttribute("data-line-series-state", "active");
    expect(compareLine).toHaveAttribute("data-line-series-state", "compare");
    expect(hiddenLine).not.toBeInTheDocument();
    expect(activeLine).toHaveAttribute("opacity", "1");
    expect(compareLine).toHaveAttribute("opacity", "0.28");
    expect(container.querySelector('path[data-area-series-key="bench"]')).toBeInTheDocument();

    fireEvent.focus(screen.getByRole("button", { name: "8 Apr 26" }));

    const tooltip = await screen.findByText("Bench");
    expect(tooltip.closest("div.left-2.top-2")).toBeInTheDocument();
  });

  it("supports a minimum width for scrollable mobile chart layouts", () => {
    const { container } = render(
      <SimpleLineChart
        data={[{ date: "24 Apr", maxWeight: 120 }]}
        series={[{ key: "maxWeight", label: "Bench Press", color: "#6366f1" }]}
        xKey="date"
        minWidth={620}
      />,
    );

    expect(container.firstChild).toHaveStyle({ minWidth: "620px" });
  });

  it("preserves CSS variable colors on rendered line strokes", () => {
    const { container } = render(
      <SimpleLineChart
        data={[
          { date: "24 Apr", maxWeight: 120 },
          { date: "1 May", maxWeight: 122.5 },
        ]}
        series={[{ key: "maxWeight", label: "Bench Press", color: "var(--chart-1)" }]}
        xKey="date"
      />,
    );

    expect(container.querySelector('path[data-line-series-key="maxWeight"]')).toHaveAttribute("stroke", "var(--chart-1)");
  });
});
