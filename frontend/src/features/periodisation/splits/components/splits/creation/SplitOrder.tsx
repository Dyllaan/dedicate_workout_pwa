import { useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  RotateCcw,
  ListOrdered,
  ArrowLeft,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkoutTemplate } from "@/features/workout/types/Workout";
import Section from "@/components/layout/section/Section";
import type { CreateSplitRequest } from "@/features/workout/types/Workout";
import { ICONS } from "@/config/iconConfig";
import FormPage from "@/components/layout/frames/FormPage";
import BaseInput from "@/components/layout/input/BaseInput";

interface WorkoutOrderingProps {
  workouts: WorkoutTemplate[];
  initialFrequencies?: Record<string, number>;
  onBack: () => void;
  onComplete: (split: CreateSplitRequest) => void;
  isSubmitting?: boolean;
}

function SortableWorkoutItem({
  workout,
  index,
  frequency,
  onFrequencyChange,
}: {
  workout: WorkoutTemplate;
  index: number;
  frequency: number;
  onFrequencyChange: (delta: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workout.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card p-4 touch-none transition-colors",
        isDragging
          ? "opacity-50 shadow-2xl scale-105 z-50"
          : "hover:bg-muted/50 shadow-sm",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-sm shrink-0">
          {index + 1}
        </div>

        <div
          {...attributes}
          {...listeners}
          data-testid={`split-order-drag-handle-${index}`}
          className="touch-none cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <GripVertical className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-lg">{workout.name}</p>
          <p className="text-sm text-muted-foreground">
            {workout.exercises.length} exercise
            {workout.exercises.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            icon={undefined}
            type="button"
            size="icon"
            className="h-8 w-8"
            aria-label={`Decrease ${workout.name} frequency`}
            onClick={() => onFrequencyChange(-1)}
            disabled={frequency <= 1}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-12 text-center text-sm font-semibold tabular-nums text-foreground">
            {frequency}x/wk
          </span>
          <Button
            icon={undefined}
            type="button"
            size="icon"
            className="h-8 w-8"
            aria-label={`Increase ${workout.name} frequency`}
            onClick={() => onFrequencyChange(1)}
            disabled={frequency >= 7}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SplitOrder({
  workouts: initialWorkouts,
  initialFrequencies = {},
  onBack,
  onComplete,
  isSubmitting = false,
}: WorkoutOrderingProps) {
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>(initialWorkouts);
  const [frequencies, setFrequencies] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialWorkouts.map((workout) => [
      workout.id,
      Math.max(1, Math.min(7, initialFrequencies[workout.id] ?? 1)),
    ])),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [splitName, setSplitName] = useState<string>("My Split");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = workouts.findIndex((w) => w.id === active.id);
    const newIndex = workouts.findIndex((w) => w.id === over.id);

    setWorkouts(arrayMove(workouts, oldIndex, newIndex));
  };

  const handleReset = () => {
    setWorkouts(initialWorkouts);
    setFrequencies(Object.fromEntries(initialWorkouts.map((workout) => [
      workout.id,
      Math.max(1, Math.min(7, initialFrequencies[workout.id] ?? 1)),
    ])));
  };

  const updateFrequency = (workoutId: string, delta: number) => {
    setFrequencies((current) => ({
      ...current,
      [workoutId]: Math.max(1, Math.min(7, (current[workoutId] ?? 1) + delta)),
    }));
  };

  const handleComplete = () => {
    const createSplitDTO: CreateSplitRequest = {
      name: splitName.trim(),
      workoutFrequencies: workouts.map((workout) => ({
        workoutTemplateId: workout.id,
        sessionsPerWeek: frequencies[workout.id] ?? 1,
      })),
    };
    onComplete(createSplitDTO);
  };

  const activeWorkout = activeId
    ? workouts.find((w) => w.id === activeId)
    : null;

  const hasChangedOrder =
    JSON.stringify(workouts.map((w) => w.id)) !==
    JSON.stringify(initialWorkouts.map((w) => w.id));
  const hasChangedFrequencies = workouts.some((workout) =>
    (frequencies[workout.id] ?? 1) !== Math.max(1, Math.min(7, initialFrequencies[workout.id] ?? 1)),
  );

  const canComplete = splitName.trim().length > 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <FormPage
        icon={ICONS.split}
        title="Order Your Split"
        onSave={handleComplete}
        onReset={onBack}
        undoLabel="Back"
        isValid={canComplete}
        saveLabel="Complete"
        isSaving={isSubmitting}
        hasChanges={hasChangedOrder || hasChangedFrequencies || splitName.trim().length > 0}
        undoIcon={ArrowLeft}
      >
        <div className="flex flex-col gap-6">
          <Section title="Split Name" icon={ListOrdered}>
            <div className="flex-col flex gap-4">
              <BaseInput
                value={splitName}
                onChange={(e) => setSplitName(e.target.value)}
                placeholder="Enter split name..."
              />
              <div className="flex items-center justify-between">
                {hasChangedOrder && (
                  <Button
                    icon={undefined}
                    size="sm"
                    onClick={handleReset}
                    className="gap-2 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </Section>

          <div className="flex flex-col gap-4">
            <span className="text-sm text-muted-foreground">
              Drag and drop to order your split
            </span>
            <SortableContext
              items={workouts.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {workouts.map((workout, index) => (
                  <SortableWorkoutItem
                    key={workout.id}
                    workout={workout}
                    index={index}
                    frequency={frequencies[workout.id] ?? 1}
                    onFrequencyChange={(delta) => updateFrequency(workout.id, delta)}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        </div>
        <DragOverlay>
          {activeWorkout ? (
            <div className="p-4 rounded-lg border border-primary bg-card shadow-2xl rotate-3 scale-105">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center shadow-sm">
                  {workouts.findIndex((w) => w.id === activeWorkout.id) + 1}
                </div>
                <GripVertical className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground text-lg">
                    {activeWorkout.name}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </FormPage>
    </DndContext>
  );
}
