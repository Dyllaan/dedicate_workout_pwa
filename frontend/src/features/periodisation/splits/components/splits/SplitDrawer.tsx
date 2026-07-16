import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import type {Split} from "@/types/Workout.ts";
import SplitOverviewPanel from "@/components/periodisation/panels/SplitOverviewPanel.tsx";

type SplitDrawerProps = {
    split: Split | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function SplitDrawer({ split, open, onOpenChange }: SplitDrawerProps) {

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm p-4">
                    <DrawerHeader>
                        <DrawerTitle>{split?.name || "Split Overview"}</DrawerTitle>
                    </DrawerHeader>
                    {split && <SplitOverviewPanel splitId={split.id} />}
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
