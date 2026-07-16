import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit, Trash2 } from "lucide-react";
import usePeriodisationActions from "@/hooks/periodisation/usePeriodisationActions";
import { useSplit } from "@/hooks/periodisation/useSplits";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import { ConfirmDashCardRow } from "@/components/layout/card/ConfirmDashCardRow";
import WorkoutFrequencyStepper from "../WorkoutFrequencyStepper";
import { normalizeSplitWorkoutFrequencies } from "@/utils/splitWorkoutFrequencies";
import Panel from "@/components/layout/Panel.tsx";

export default function SplitOverviewPanel({ splitId }: { splitId: string }) {
  const { data: split } = useSplit(splitId);
  const { handleSelectSplit, handleDeleteSplit, handleUpdateSplitFrequencies } = usePeriodisationActions(splitId);
  const normalizedFrequencies = useMemo(() => normalizeSplitWorkoutFrequencies(split), [split]);
  const frequencySignature = JSON.stringify(normalizedFrequencies);
  const [savedFrequencies, setSavedFrequencies] = useState(normalizedFrequencies);
  const [draftFrequencies, setDraftFrequencies] = useState(normalizedFrequencies);

  useEffect(() => {
    setSavedFrequencies(normalizedFrequencies);
    setDraftFrequencies(normalizedFrequencies);
  }, [split?.id, frequencySignature]);

  if (!split) return null;

  const handleSaveFrequencies = async () => {
    const saved = await handleUpdateSplitFrequencies(split, draftFrequencies);
    if (saved) {
      setSavedFrequencies(draftFrequencies);
    }
  };

  return (
    <Panel>
        <DashCardRow
          label="Edit Order"
          description="Change the sequence of your workouts."
          to={`/periodisation/splits/${split.id}/edit`}
          icon={Edit}
        />
      <DashCardRow
        label="Programmes"
        description="View and manage all programmes for this split."
        to={`/periodisation/splits/${split.id}`}
        icon={Edit}
      />
      {!split.active && (
        <>
          <ConfirmDashCardRow
            label="Delete Split"
            icon={Trash2}
              description="Remove this split and all associated data."
              onClick={() => handleDeleteSplit(split.id)}
            />
            <ConfirmDashCardRow
            label="Activate Split"
            icon={CheckCircle2}
            description="Make this split active and start tracking progress."
            onClick={() => handleSelectSplit(split)}
          />
          </>
        )}

      <WorkoutFrequencyStepper
        split={split}
        frequencies={draftFrequencies}
        baselineFrequencies={savedFrequencies}
        onChange={setDraftFrequencies}
        onReset={() => setDraftFrequencies(savedFrequencies)}
        onSave={handleSaveFrequencies}
      />
    </Panel>
  );
}
