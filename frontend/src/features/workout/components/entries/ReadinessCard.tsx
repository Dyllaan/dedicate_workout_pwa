import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Smile, Target, Zap } from "lucide-react";
import ReadinessScaleRow from "@/components/workout/entries/ReadinessScaleRow";
import type { ReadinessFormState } from "@/hooks/forms/workoutEntryFormTypes";

interface ReadinessCardProps {
  readinessForm: ReadinessFormState;
  onChange: (field: keyof ReadinessFormState, value: number) => void;
  onSave: () => Promise<void> | void;
  onSkip: () => void;
  isSaving?: boolean;
}

export default function ReadinessCard({
  readinessForm,
  onChange,
  onSave,
  onSkip,
  isSaving = false,
}: ReadinessCardProps) {
  const readinessQuickScore = useMemo(() => {
    return (
      readinessForm.sleepQuality +
      (6 - readinessForm.stressLevel) +
      (6 - readinessForm.sorenessLevel) +
      readinessForm.confidenceLevel
    );
  }, [readinessForm]);

  return (
    <>
      <ReadinessScaleRow
        label="Sleep quality"
        icon={Moon}
        value={readinessForm.sleepQuality}
        onChange={(value) => onChange("sleepQuality", value)}
      />
      <ReadinessScaleRow
        label="Stress"
        icon={Zap}
        value={readinessForm.stressLevel}
        onChange={(value) => onChange("stressLevel", value)}
      />
      <ReadinessScaleRow
        label="Soreness"
        icon={Target}
        value={readinessForm.sorenessLevel}
        onChange={(value) => onChange("sorenessLevel", value)}
      />
      <ReadinessScaleRow
        label="Confidence"
        icon={Smile}
        value={readinessForm.confidenceLevel}
        onChange={(value) => onChange("confidenceLevel", value)}
      />

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">Projected score: {readinessQuickScore}/20</p>
        <div className="flex items-center gap-2">
          <Button
            icon={undefined}
            type="button"
            size="sm"
            onClick={onSkip}
          >
            Skip now
          </Button>
          <Button
            icon={undefined}
            type="button"
            size="sm"
            onClick={() => void onSave()}
            disabled={isSaving}
          >
            Save readiness
          </Button>
        </div>
      </div>
    </>
  );
}
