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
import { Results } from "@/components/workout/entries/1rm/Results";
import type { SetFormData } from "@/hooks/forms/workoutEntryFormTypes";
import type { SetEntryWithDate } from "@/types/dto/SetEntryWithDate";
import useBodyweightLogs from "@/hooks/workout/useBodyweightLogs";

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
