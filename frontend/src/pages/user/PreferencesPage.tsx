import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { enqueueSnackbar } from "notistack";

import Page from "@/components/layout/frames/Page";
import Section from "@/components/layout/section/Section";
import BaseInput from "@/components/layout/input/BaseInput";
import { Button } from "@/components/ui/button";
import { SelectionChip } from "@/components/ui/selection-chip";
import { ICONS } from "@/config/iconConfig";
import { useUnitPreference } from "@/features/preferences/unit/hooks/useUnitPreference";
import { useWorkoutSettings } from "@/features/workout/hooks/useWorkoutSettings";
import { DashCardRow } from "@/components/layout/card/DashCardRow";

export default function PreferencesPage() {
  const { unit, setUnit } = useUnitPreference();
  const { settings, updateSettings, isSaving } = useWorkoutSettings();
  const [defaultRestSeconds, setDefaultRestSeconds] = useState("90");

  useEffect(() => {
    setDefaultRestSeconds(String(settings.defaultRestSeconds));
  }, [settings.defaultRestSeconds]);

  const saveDefaultRestSeconds = async () => {
    const nextValue = Math.max(0, Math.min(7200, Math.round(parseInt(defaultRestSeconds) || 0)));
    try {
      const saved = await updateSettings({ defaultRestSeconds: nextValue });
      setDefaultRestSeconds(String(saved.defaultRestSeconds));
      enqueueSnackbar("Default rest target updated.", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to update default rest target.", { variant: "error" });
    }
  };

  return (
    <Page icon={ICONS.settings} title="Preferences" subtitle="Tune your training defaults.">
      <Section divided={false} title="Training Defaults">
        <div className="flex flex-col gap-4 pb-4">
          <span className="text-sm font-medium">Weight unit</span>
          <div data-testid="user-weight-unit-chip-group" className="grid grid-cols-2 gap-2">
            <SelectionChip
              selected={unit === "kg"}
              className="w-full"
              onClick={() => setUnit("kg")}
            >
              kg
            </SelectionChip>
            <SelectionChip
              selected={unit === "lbs"}
              className="w-full"
              onClick={() => setUnit("lbs")}
            >
              lbs
            </SelectionChip>
          </div>
        </div>

        <BaseInput
          label="Default rest target"
          labelIcon={Timer}
          id="defaultRestSeconds"
          type="number"
          min={0}
          max={7200}
          inputMode="numeric"
          value={defaultRestSeconds}
          onChange={(e) => setDefaultRestSeconds(e.target.value)}
          placeholder="Enter default rest target"
          required
          disabled={isSaving}
          autoComplete="username"
        />
        <Button
          icon={Timer}
          disabled={isSaving}
          onClick={() => void saveDefaultRestSeconds()}
        >
          Save
        </Button>
      </Section>
      <DashCardRow
          label="Manage exercise definitions"
          description="View and collapse your saved exercise definitions."
          icon={ICONS.exercise}
          to={"/insights/exercise-definitions"}
        >
        </DashCardRow>
    </Page>
  );
}
