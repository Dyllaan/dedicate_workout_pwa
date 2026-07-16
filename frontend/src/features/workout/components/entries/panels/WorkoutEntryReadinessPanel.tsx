import Section from "@/components/layout/Section";
import { type CurrentWeekContext } from "@/hooks/forms/useCurrentWeek";
import { ProgrammeContextBanner } from "../ProgrammeContextBanner";
import ReadinessCard from "../ReadinessCard";
import type { ReadinessFormState } from "@/hooks/forms/workoutEntryFormTypes";

type Props = {
  readinessForm: ReadinessFormState;
  onReadinessChange: (field: keyof ReadinessFormState, value: number) => void;
  onReadinessSave: () => Promise<void> | void;
  onReadinessSkip: () => void;
  onGoToWorkoutTab: () => void;
  isSaving?: boolean;
  programmeContext: CurrentWeekContext | null;
};

export default function WorkoutEntryReadinessPanel({
  readinessForm,
  onReadinessChange,
  onReadinessSave,
  onReadinessSkip,
  onGoToWorkoutTab,
  isSaving = false,
  programmeContext,
}: Props) {
  const handleSave = async () => {
    await onReadinessSave();
    onGoToWorkoutTab();
  };

  const handleSkip = () => {
    onReadinessSkip();
    onGoToWorkoutTab();
  };

  return (
    <div className="flex flex-col gap-3">
      {programmeContext?.block && programmeContext.week ? (
        <ProgrammeContextBanner block={programmeContext.block} week={programmeContext.week} />
      ) : null}

      <Section title="Readiness check-in" subtitle="How are you feeling today?" divided={false}>
        <ReadinessCard
          readinessForm={readinessForm}
          onChange={onReadinessChange}
          onSave={handleSave}
          onSkip={handleSkip}
          isSaving={isSaving}
        />
      </Section>
    </div>
  );
}
