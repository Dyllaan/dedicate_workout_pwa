import { CheckCircle2, Clock } from "lucide-react";
import { sortByCreatedAtDesc } from "@/utils/sort";
import type { Programme } from "@/features/periodisation/types/Periodisation";
import type { Split } from "@/features/workout/types/Workout";
import type { PagedResponse } from "@/api/types/Pagination";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import Section from "@/components/layout/section/Section";
import { getProgrammePresetLabel } from "@/features/periodisation/utils/periodisationConfig";
import { PaginationControls } from "@/components/ui";
import {PrimaryAction} from "@/components/layout/card/PrimaryAction.tsx";

function formatProgrammeDate(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

export default function ProgrammesPanel({
  split,
  programmes,
  pageInfo,
  onPreviousPage,
  onNextPage,
}: {
  split: Split;
  programmes: Programme[];
  pageInfo?: PagedResponse<Programme> | null;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
}) {
  const sorted = [...programmes].sort(sortByCreatedAtDesc);
  const activeProgramme = sorted.find((programme) => programme.active) ?? null;
  const inactiveProgrammes = sorted.filter((programme) => !programme.active && !programme.archived);
  const archivedProgrammes = sorted.filter((programme) => programme.archived);

  return (
    <Section divided={true}>
      {activeProgramme ? (
        <PrimaryAction
          label={getProgrammePresetLabel(activeProgramme.presetType)}
          description={`${activeProgramme.blocks.length} block${activeProgramme.blocks.length !== 1 ? "s" : ""} / ${activeProgramme.blocks.reduce((sum, b) => sum + b.durationWeeks, 0)} week${activeProgramme.blocks.reduce((sum, b) => sum + b.durationWeeks, 0) !== 1 ? "s" : ""}`}
          overline={formatProgrammeDate(activeProgramme.createdAt) ? `${formatProgrammeDate(activeProgramme.createdAt)}` : undefined}
          to={`/periodisation/splits/${split.id}?tab=your-programme&programmeId=${activeProgramme.id}`}
          icon={CheckCircle2}
        />
      ) : null}

      {inactiveProgrammes.map((programme) => (
        <DashCardRow
          label={getProgrammePresetLabel(programme.presetType)}
          description={`${programme.blocks.length} block${programme.blocks.length !== 1 ? "s" : ""} / ${programme.blocks.reduce((sum, b) => sum + b.durationWeeks, 0)} week${programme.blocks.reduce((sum, b) => sum + b.durationWeeks, 0) !== 1 ? "s" : ""}`}
          to={`/periodisation/splits/${split.id}?tab=your-programme&programmeId=${programme.id}`}
          icon={Clock}
          key={programme.id}
          datetime={formatProgrammeDate(programme.createdAt) ? `${formatProgrammeDate(programme.createdAt)}` : undefined}
        />
      ))}
      {archivedProgrammes.map((programme) => (
        <DashCardRow
          label={getProgrammePresetLabel(programme.presetType)}
          description={`${programme.blocks.length} block${programme.blocks.length !== 1 ? "s" : ""} / ${programme.blocks.reduce((sum, b) => sum + b.durationWeeks, 0)} week${programme.blocks.reduce((sum, b) => sum + b.durationWeeks, 0) !== 1 ? "s" : ""}`}
          to={`/periodisation/splits/${split.id}?tab=your-programme&programmeId=${programme.id}`}
          icon={Clock}
          key={programme.id}
          datetime={formatProgrammeDate(programme.createdAt) ? `${formatProgrammeDate(programme.createdAt)}` : undefined}
          variant="archived"
        />
      ))}

      {pageInfo && onPreviousPage && onNextPage ? (
        <PaginationControls
          className="mt-4"
          page={pageInfo.page}
          totalPages={pageInfo.totalPages}
          hasPrevious={pageInfo.hasPrevious}
          hasNext={pageInfo.hasNext}
          totalItems={pageInfo.totalItems}
          onPrevious={onPreviousPage}
          onNext={onNextPage}
        />
      ) : null}
    </Section>
  );
}
