import { MapPin, Trash2, Archive, Calendar, CheckCircle2, CircleOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getProgrammePresetLabel } from "@/utils/periodisationConfig";
import ProgrammeTimeline from "@/components/programme/ProgrammeTimeline";
import usePeriodisationActions from "@/hooks/periodisation/usePeriodisationActions";
import useProgramme from "@/hooks/periodisation/useProgramme";
import { BLOCK_TYPE_CONFIG, BLOCK_TYPE_FALLBACK } from "@/utils/periodisationConfig";
import type { Split } from "@/types/Workout";
import type { Programme } from "@/types/Periodisation";
import { ConfirmDashCardRow } from "@/components/layout/card/ConfirmDashCardRow";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import Section from "@/components/layout/Section";
import { ICONS } from "@/config/iconConfig";

export default function YourProgramme({ split, activeProgramme }: { split: Split; activeProgramme: Programme | null }) {

  const { getCurrentBlock, getCurrentWeekNumber } = useProgramme(split.id);
  const {
    handleSetProgrammeStartDate,
    handleSetProgrammeActive,
    handleDeleteProgramme,
    loadingAction,
    handleArchiveProgramme
  } = usePeriodisationActions(split.id);

  if (!activeProgramme) return null;

  const sortedBlocks = [...(activeProgramme.blocks)].sort((a, b) => a.blockOrder - b.blockOrder);
  const currentBlock = getCurrentBlock(activeProgramme.id);
  const currentWeekNum = currentBlock ? getCurrentWeekNumber(currentBlock) : null;
  const totalProgrammeWeeks = sortedBlocks.reduce((sum, block) => sum + block.durationWeeks, 0);
  const weeksElapsed = (() => {
    if (!currentBlock) return 0;
    const completedWeeks = sortedBlocks
      .filter((block) => block.blockOrder < currentBlock.blockOrder)
      .reduce((sum, block) => sum + block.durationWeeks, 0);
    return completedWeeks + (currentWeekNum ? currentWeekNum - 1 : 0);
  })();

  const overallProgress =
    totalProgrammeWeeks > 0 ? Math.round((weeksElapsed / totalProgrammeWeeks) * 100) : 0;
  const currentBlockConfig = currentBlock
    ? (BLOCK_TYPE_CONFIG[currentBlock.blockType] ?? BLOCK_TYPE_FALLBACK)
    : null;

  return (
    <Section icon={ICONS.programme} title={getProgrammePresetLabel(activeProgramme.presetType) ?? "Custom Programme"}>
      {activeProgramme.archived && (
        <Badge variant="outline" className="w-max mb-4">
          <Archive className="w-3 h-3 mr-1" />
          Archived Programme
        </Badge>
      )}
      <DashCardRow label="Current block" description={currentBlock ? currentBlock.name : "No active block" } icon={MapPin} variant="static" badge={currentBlockConfig ? currentBlockConfig.label : "Unknown"} />

      <DashCardRow
        icon={MapPin}
        variant="static"
        label="Current week"
        description={
          currentWeekNum && currentBlock
            ? `Week ${currentWeekNum} of ${currentBlock.durationWeeks} in current block`
            : "No active block"
        }
      />

      <DashCardRow
        icon={MapPin}
        variant="static"
        label="Total programme duration"
        description={`${totalProgrammeWeeks} weeks across ${activeProgramme.blocks.length} blocks.`}
        badge={<div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={overallProgress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{overallProgress}%</span>
        </div>}
      />

      <DashCardRow
        icon={Calendar}
        label="Programme start date"
        description="Date programme started/will start."
        variant="datepicker"
        onDateConfirm={(iso) => handleSetProgrammeStartDate(activeProgramme.id, iso)}
        disabled={loadingAction === "setProgrammeStartDate" || activeProgramme.archived}
        required={false}
      />

      <DashCardRow
        label="Programme active state"
        description={activeProgramme.active ? "This programme is currently active." : "This programme is currently inactive."}
        actionLabel={activeProgramme.active ? "Deactivate" : "Activate"}
        icon={activeProgramme.active ? CheckCircle2 : CircleOff}
        variant={activeProgramme.active ? "active" : "default"}
        onClick={() => handleSetProgrammeActive(activeProgramme.id, !activeProgramme.active)}
        disabled={activeProgramme.archived || loadingAction === "setProgrammeActive"}
      />

      <ConfirmDashCardRow
        label="Delete programme"
        icon={Trash2}
        description="This will delete the entire programme and all associated blocks. This action cannot be undone."
        onClick={() => handleDeleteProgramme(activeProgramme.id)}
      />
      {!activeProgramme.archived && (
        <ConfirmDashCardRow
          label="Archive programme"
          icon={Archive}
          description="This will archive the programme and make it read-only."
          onClick={() => handleArchiveProgramme(activeProgramme.id)}
        />
      )}

      {activeProgramme ? (
        <ProgrammeTimeline
          splitId={split.id}
          programme={activeProgramme}
          currentBlock={currentBlock}
          getCurrentWeekNumber={getCurrentWeekNumber}
        />
      ) : null}
    </Section>
  );
}
