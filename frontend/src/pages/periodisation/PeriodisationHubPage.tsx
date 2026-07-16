import { Layers } from "lucide-react";
import Page from "@/components/layout/section/Page";
import { Plus } from "lucide-react";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import { ICONS } from "@/config/iconConfig";
import useSplits from "@/hooks/periodisation/useSplits";
import { sortByCreatedAtDesc } from "@/utils/sort";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import PaginatedContainer from "@/components/layout/PaginatedContainer.tsx";
import {PrimaryAction} from "@/components/layout/card/PrimaryAction.tsx";
import SplitDrawer from "@/features/periodisation/splits/components/splits/SplitDrawer";
import {useState} from "react";
import type {Split} from "@/types/Workout.ts";


export default function PeriodisationHubPage() {
  const { page, size, setPage } = useUrlPagination({ pageParam: "splitsPage", sizeParam: "splitsSize" });
  const { splits, activeSplit, getActiveProgramme, pageInfo } = useSplits({ page, size });
  const [open, setOpen] = useState(false);
  const [openSplit, setOpenSplit] = useState<Split | null>(activeSplit);
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
