import { screen } from "@testing-library/react";
import ProgrammesPanel from "@/features/periodisation/components/panels/ProgrammesPanel";
import { buildProgramme, buildSplit } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

describe("ProgrammesPanel", () => {
  it("renders active programme label from preset type", () => {
    const activeProgramme = buildProgramme({
      id: "programme-active",
      active: true,
      presetType: "HYPERTROPHY_STRENGTH",
    });
    const split = buildSplit({
      id: "split-1",
      programmes: [activeProgramme],
    });

    renderWithProviders(<ProgrammesPanel split={split} programmes={[activeProgramme]} />, {
      route: "/periodisation/splits/split-1?tab=all-programmes",
    });

    expect(screen.getByRole("button", { name: /hypertrophy \+ strength programme/i })).toBeInTheDocument();
  });

  it("falls back to Custom Programme for custom and legacy missing preset types", () => {
    const activeProgramme = buildProgramme({
      id: "programme-custom",
      active: true,
      presetType: "CUSTOM",
    });
    const legacyProgramme = buildProgramme({
      id: "programme-legacy",
      active: false,
      presetType: null,
    });
    const split = buildSplit({
      id: "split-1",
      programmes: [activeProgramme, legacyProgramme],
    });

    renderWithProviders(<ProgrammesPanel split={split} programmes={[activeProgramme, legacyProgramme]} />, {
      route: "/periodisation/splits/split-1?tab=all-programmes",
    });

    expect(screen.getAllByText("Custom Programme")).toHaveLength(2);
  });
});
