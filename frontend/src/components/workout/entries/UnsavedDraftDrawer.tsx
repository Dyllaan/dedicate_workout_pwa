import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { clearWorkoutEntryDraft, type WorkoutEntryDraftSummary } from "@/hooks/forms/workoutEntryDraft";

type UnsavedDraftDrawerProps = {
  drafts: WorkoutEntryDraftSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function UnsavedDraftDrawer({
  drafts,
  open,
  onOpenChange,
}: UnsavedDraftDrawerProps) {
  const navigate = useNavigate();

  const handleOpenDraft = (templateId: string) => {
    onOpenChange(false);
    navigate(`/workout/${templateId}/create`);
  };

  const handleDeleteDraft = (templateId: string) => {
    clearWorkoutEntryDraft(templateId);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4">
          <DrawerHeader className="flex flex-col gap-2">
            <DrawerTitle>You have unsaved workout drafts</DrawerTitle>
            <DrawerDescription>
              Open one to continue or delete it if you do not need it anymore.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3">
            {drafts.map((draft) => (
              <div
                key={draft.templateId}
                className="rounded-2xl border border-border bg-card p-4 shadow-xs"
              >
                <p className="text-sm font-semibold text-foreground">{draft.templateName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Saved {new Date(draft.savedAt).toLocaleString()}
                </p>

                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleOpenDraft(draft.templateId)}
                  >
                    Open
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteDraft(draft.templateId)}
                    icon={Trash2}
                    aria-label={`Delete draft for ${draft.templateName}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DrawerFooter className="px-0 pb-0">
            <DrawerClose asChild>
              <Button variant="secondary">Ignore</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
