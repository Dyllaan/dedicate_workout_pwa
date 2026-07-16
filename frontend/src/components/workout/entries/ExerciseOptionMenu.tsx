import * as React from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeftIcon,
  BrainCog,
  MoreHorizontalIcon,
  SlidersHorizontal,
  Trash2Icon,
  ArchiveRestore as RestoreIcon,
} from "lucide-react"
import type { WorkoutEntryExerciseDraft } from "@/hooks/forms/workoutEntryFormTypes";

interface ExerciseOptionMenuProps {
  exerciseIdx: number;
  exerciseItem: WorkoutEntryExerciseDraft;
  setIdx: number;
  removeSet: (exerciseIdx: number, setIdx: number) => void;
  setRpeOpenFor: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  restore: (setIdx: number) => void;
  handlePrediction: (setIdx: number) => void;
  showRestore: boolean;
}

export function ExerciseOptionMenu({ showRestore, exerciseIdx, exerciseItem, setIdx, removeSet, setRpeOpenFor, restore, handlePrediction }: ExerciseOptionMenuProps) {
  
  return (
    <ButtonGroup>
      <ButtonGroup className="hidden sm:flex">
        <Button icon={undefined} size="icon" aria-label="Go Back" title="Go back">
          <ArrowLeftIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button icon={undefined} size="icon" aria-label="More Options" title="More options">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuGroup>
              {
                showRestore && (
                    <DropdownMenuItem onSelect={() => restore(setIdx)}>
                      <RestoreIcon className="h-4 w-4 mr-2" />
                      Restore
                  </DropdownMenuItem>
                )
              }
              <DropdownMenuItem onSelect={() => setRpeOpenFor(prev => ({ ...prev, [setIdx]: !prev[setIdx] }))}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                RPE
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                handlePrediction(setIdx);
              }}>
                <BrainCog />
                Predict 1RM
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onSelect={() => removeSet(exerciseIdx, setIdx)} disabled={exerciseItem.sets.length === 1}>
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    </ButtonGroup>
  )
}
