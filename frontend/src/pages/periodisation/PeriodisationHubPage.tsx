import { Layers } from "lucide-react";
import Page from "@/components/layout/frames/Page";
import { Plus } from "lucide-react";
import { DashCardRow, DashCardRowSkeleton } from "@/components/layout/card/DashCardRow";
import { ICONS } from "@/config/iconConfig";
import useSplits from "@/features/periodisation/splits/hooks/useSplits";
import { sortByCreatedAtDesc } from "@/utils/sort";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import PaginatedContainer from "@/components/layout/frames/PaginatedContainer";
import {PrimaryAction} from "@/components/layout/card/PrimaryAction.tsx";
import SplitDrawer from "@/features/periodisation/splits/components/splits/SplitDrawer";
import {useState} from "react";
import type {Split} from "@/features/workout/types/Workout";


export default function PeriodisationHubPage() {
  const { page, size, setPage } = useUrlPagination({ pageParam: "splitsPage", sizeParam: "splitsSize" });
  const { splits, activeSplit, getActiveProgramme, pageInfo, isLoading } = useSplits({ page, size });
  const [open, setOpen] = useState(false);
  const [openSplit, setOpenSplit] = useState<Split | null>(activeSplit);

  if (isLoading && splits.length === 0) {
    return (
      <Page
        title="Periodisation"
        subtitle="Loading your splits..."
        icon={Layers}
      >
        <PaginatedContainer onPageChange={setPage} currentPage={page} total={undefined}>
          <DashCardRowSkeleton />
          <DashCardRowSkeleton />
          <DashCardRowSkeleton />
          <DashCardRowSkeleton />
          <DashCardRowSkeleton />
          <DashCardRowSkeleton />
        </PaginatedContainer>
      </Page>
    );
  }

  return (
    <Page
      title="Periodisation"
      subtitle="Manage splits, programmes, and block timelines."
      icon={Layers}
    >
      <SplitDrawer split={openSplit} open={open} onOpenChange={setOpen} />
      <PaginatedContainer onPageChange={setPage} currentPage={page} total={pageInfo?.totalPages}>
        {splits.length === 0 ? (
            <PrimaryAction label={"Create New Split"} description="Create a new split." to="/splits/create" icon={Plus} />
            ) : (
            <DashCardRow
                label="Create New Split"
                description="Create a new split."
                to="/splits/create"
                icon={Plus}
            />
        )}

        {[...splits].sort(sortByCreatedAtDesc).map((split) => {
          const activeProgramme = getActiveProgramme(split);
          return (
            <DashCardRow
              key={split.id}
              label={split.name}
              description={activeProgramme ? "Active programme running" : "No active programme"}
              onClick={() => {
                setOpenSplit(split);
                setOpen(true);
              }}
              icon={ICONS.split}
              variant={split.id === activeSplit?.id ? "active" : "default"}
            />
          );
        })}
      </PaginatedContainer>
    </Page>
  );
}
