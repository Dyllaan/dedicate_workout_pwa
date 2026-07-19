import { Calendar, Hash, Hourglass, SlidersHorizontal } from "lucide-react";
import type { Block, Programme } from "@/features/periodisation/types/Periodisation";
import { STRATEGY_LABELS } from "@/features/periodisation/utils/periodisationConfig";
import Section from "@/components/layout/section/Section";
import { WeekCard } from "@/features/periodisation/week/components/WeekCard";
import usePeriodisationActions from "@/features/periodisation/hooks/usePeriodisationActions";
import { useInitiateTestProtocol } from "@/features/workout/test-1rm/hooks/useInitiateTestProtocol";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import EmptyState from "@/components/layout/feedback/EmptyState";
import { ICONS } from "@/config/iconConfig";
import StatTile from "@/components/ui/stat-tile";
import StatGrid from "@/components/ui/StatGrid";
import Panel from "@/components/layout/frames/Panel";

type BlockPanelProps = {
  splitId: string;
  block: Block | null;
  programmes: Programme[];
  workoutTemplates?: Array<{ id: string; name: string; hasFocusExercise: boolean }>;
};

export default function BlockPanel({ splitId, block, programmes, workoutTemplates }: BlockPanelProps) {
  const {
    handleSetBlockStartDate,
    loadingAction,
    handleUpdateDeload,
    handleUpdateTargetSets,
  } = usePeriodisationActions(splitId);

  const { initiate } = useInitiateTestProtocol();

  if (!block) {
    return (
      <Section icon={ICONS.block} title="No block available">
        <EmptyState
          icon={ICONS.block}
          title="No block available"
          description="Create or activate a programme with blocks to see block details here."
        />
      </Section>
    );
  }

  const sortedWeeks = [...block.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const isArchivedProgramme = programmes.some((programme) =>
    programme.archived && programme.blocks.some((candidateBlock) => candidateBlock.id === block.id),
  );

  const computeNextWeekInfo = (weekIdx: number) => {
    const nextWeek = sortedWeeks[weekIdx + 1];
    return nextWeek
      ? { nextWeekId: nextWeek.id, nextWeekTargetSets: nextWeek.targetSetsPerExercise }
      : undefined;
  };

  const handleTest1rm = async (
    workoutTemplateId: string,
    weekId: string,
    currentTargetSets: number,
    nextWeekInfo?: { nextWeekId: string; nextWeekTargetSets: number },
  ) => {
    await initiate(weekId, workoutTemplateId, currentTargetSets, nextWeekInfo);
  };

  return (
    <Panel>
      <Section icon={ICONS.block} title={block.name} divided={false} className="border-0">
        <DashCardRow
          disabled={loadingAction === "setBlockStartDate"}
          icon={Hourglass}
          label="Start date"
          description="Block start date."
          required={false}
          variant="datepicker"
          onDateConfirm={(iso) => handleSetBlockStartDate(block.id, iso)}
        />
        <StatGrid cols={2} className="border-b-0">
          <StatTile label="Duration" value={`${block.durationWeeks} weeks`} icon={Calendar}/>
          <StatTile label="RPE range" value={`${block.targetRpeMin} - ${block.targetRpeMax}`} icon={SlidersHorizontal}/>
          <StatTile label="Rep range" value={`${block.repRangeMin} - ${block.repRangeMax}`} icon={Hash} />
          <StatTile label="Progression" value={STRATEGY_LABELS[block.progressionStrategy] ?? block.progressionStrategy} icon={ICONS.progress} />
        </StatGrid>
      </Section>

      <Section icon={Calendar} title="Weeks" divided={false}>
        {sortedWeeks.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No weeks found"
            description="This block does not have any weeks yet."
            compact
          />
        ) : (
          <div className="space-y-3">
            {sortedWeeks.map((week, idx) => (
              <WeekCard
                key={week.id}
                week={week}
                onUpdateDeload={handleUpdateDeload}
                onUpdateTargetSets={handleUpdateTargetSets}
                isReadOnly={isArchivedProgramme}
                isPeakingBlock={block.blockType === "PEAKING"}
                workoutTemplates={workoutTemplates}
                onTest1rm={(workoutTemplateId, weekId, sets) =>
                  handleTest1rm(workoutTemplateId, weekId, sets, computeNextWeekInfo(idx))
                }
              />
            ))}
          </div>
        )}
      </Section>
    </Panel>
  );
}
