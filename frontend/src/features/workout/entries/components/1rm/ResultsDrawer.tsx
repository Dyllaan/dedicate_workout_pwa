import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Results } from "@/features/workout/entries/components/1rm/Results";
import type { SetFormData } from "@/features/workout/entries/types/workoutEntryFormTypes";
import type { SetEntryWithDate } from "@/features/workout/entries/types/SetEntryWithDate";
import useBodyweightLogs from "@/features/bodyweight/hooks/useBodyweightLogs";

type ResultsDrawerProps = {
  set: SetFormData  | SetEntryWithDate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ResultsDrawer({ set, open, onOpenChange }: ResultsDrawerProps) {
  const { logs } = useBodyweightLogs({ enabled: open && !!set });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>1RM Estimate</DrawerTitle>
            <DrawerDescription>Estimated one-rep max based on this set.</DrawerDescription>
          </DrawerHeader>
          {set && <Results set={set} bodyweightLogs={logs} />}
          <DrawerFooter>
            <DrawerClose asChild>
              <Button icon={undefined}>Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
