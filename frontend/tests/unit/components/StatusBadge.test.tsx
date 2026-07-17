import { render, screen } from "@testing-library/react";

import StatusBadge from "@/components/ui/status-badge";
import type { TrainingState } from "@/features/insights/types/Insights";

describe("StatusBadge", () => {
  it.each<[TrainingState, string, string]>([
    ["TRUE_PLATEAU", "Genuinely stalled", "ui-status-plateau"],
    ["FATIGUE_LIMITED", "Fatigue is masking performance", "ui-status-deload"],
    ["LOAD_TOO_AGGRESSIVE", "Load is ahead of readiness", "ui-status-deload"],
    ["IMPROVING", "Trend is positive", "ui-status-increase"],
    ["UNDEREXPOSED", "Needs more recent exposures", "ui-status-insufficient"],
    ["TAPERING", "Taper / recovery phase", "ui-status-neutral"],
  ])("maps %s to the expected tone class", (status, label, className) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toHaveClass("ui-status-badge", className);
  });
});
