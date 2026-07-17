import { useState } from "react";
import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Circle, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DndExerciseEntry<TExercise> = {
  id: string;
  exercise: TExercise;
};

type DndExercisesProps<TExercise> = {
  exercises: DndExerciseEntry<TExercise>[];
  isExerciseValid: (index: number) => boolean;
  onOpenExercise: (index: number) => void;
  onRemoveExercise: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  getExerciseTitle: (exercise: TExercise, index: number) => string;
  getExerciseMeta?: (exercise: TExercise, index: number) => string;
  getExerciseBadge?: (exercise: TExercise, index: number) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
};

type SortableExerciseCardProps<TExercise> = {
  entry: DndExerciseEntry<TExercise>;
  index: number;
  isValid: boolean;
  onOpen: () => void;
  onRemove: () => void;
  getExerciseTitle: (exercise: TExercise, index: number) => string;
  getExerciseMeta?: (exercise: TExercise, index: number) => string;
  getExerciseBadge?: (exercise: TExercise, index: number) => ReactNode;
};

function formatDefaultMeta(meta?: string) {
  return meta ?? "";
}

function SortableExerciseCard<TExercise>({
  entry,
  index,
  isValid,
  onOpen,
  onRemove,
  getExerciseTitle,
  getExerciseMeta,
  getExerciseBadge,
}: SortableExerciseCardProps<TExercise>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const title = getExerciseTitle(entry.exercise, index);
  const meta = formatDefaultMeta(getExerciseMeta?.(entry.exercise, index));
  const badge = getExerciseBadge?.(entry.exercise, index);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "rounded-2xl border border-border bg-card p-4",
        isDragging && "scale-[1.01] shadow-xl",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          type="button"
          data-testid={`workout-exercise-drag-handle-${index}`}
          aria-label={`Reorder exercise ${index + 1}`}
          title={`Drag to reorder exercise ${index + 1}`}
          className="mt-0.5 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            )}
            <p className="truncate text-sm font-semibold text-foreground">
              {title || `Exercise ${index + 1}`}
            </p>
            {badge ? <div className="shrink-0">{badge}</div> : null}
          </div>
          {meta ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {meta}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button icon={undefined} type="button" size="sm" onClick={onOpen} title="Open exercise">
            Open
          </Button>
          <Button
            icon={undefined}
            type="button"
            size="sm"
            onClick={onRemove}
            title="Remove exercise"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExerciseOverlay<TExercise>({
  entry,
  index,
  getExerciseTitle,
  getExerciseMeta,
}: {
  entry: DndExerciseEntry<TExercise>;
  index: number;
  getExerciseTitle: (exercise: TExercise, index: number) => string;
  getExerciseMeta?: (exercise: TExercise, index: number) => string;
}) {
  const title = getExerciseTitle(entry.exercise, index);
  const meta = formatDefaultMeta(getExerciseMeta?.(entry.exercise, index));

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-4 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {index + 1}
        </div>
        <GripVertical className="h-5 w-5 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {title || `Exercise ${index + 1}`}
          </p>
          {meta ? (
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function DndExercises<TExercise>({
  exercises,
  isExerciseValid,
  onOpenExercise,
  onRemoveExercise,
  onReorder,
  getExerciseTitle,
  getExerciseMeta,
  getExerciseBadge,
  emptyState,
  className,
}: DndExercisesProps<TExercise>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex((entry) => entry.id === active.id);
    const newIndex = exercises.findIndex((entry) => entry.id === over.id);

    if (oldIndex >= 0 && newIndex >= 0) {
      onReorder(oldIndex, newIndex);
    }
  };

  const activeExercise = activeId
    ? exercises.find((entry) => entry.id === activeId) ?? null
    : null;

  const activeIndex = activeExercise
    ? exercises.findIndex((entry) => entry.id === activeId)
    : -1;

  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={exercises.map((entry) => entry.id)}
          strategy={verticalListSortingStrategy}
        >
      <div className="space-y-3">
            {exercises.length > 0 ? (
              exercises.map((entry, index) => (
                <SortableExerciseCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  isValid={isExerciseValid(index)}
                  onOpen={() => onOpenExercise(index)}
                  onRemove={() => onRemoveExercise(index)}
                  getExerciseTitle={getExerciseTitle}
                  getExerciseMeta={getExerciseMeta}
                  getExerciseBadge={getExerciseBadge}
                />
              ))
            ) : (
              emptyState ?? (
                <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-muted-foreground">
                  No exercises added yet. Add one from suggestions or search to start building the session.
                </div>
              )
            )}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeExercise ? (
            <ExerciseOverlay
              entry={activeExercise}
              index={activeIndex}
              getExerciseTitle={getExerciseTitle}
              getExerciseMeta={getExerciseMeta}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
