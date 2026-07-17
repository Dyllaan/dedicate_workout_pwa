import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Dumbbell,
  Hash,
  List,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import FormPage from "@/components/layout/frames/FormPage";
import Section from "@/components/layout/section/Section";
import ExerciseCatalogPicker from "@/features/workout/components/ExerciseCatalogPicker";
import TabBar from "@/components/tabs/TabBar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DndExercises from "@/features/workout/components/DndExercises";
import type { WorkoutEditorExerciseValues } from "@/features/workout/templates/hooks/useWorkoutEditorForm";
import type { ExerciseInfoCatalogItem } from "@/features/heatmap/types/Heatmap";
import { cn } from "@/lib/utils";
import { getExerciseCatalogDisplayMetadata } from "@/features/heatmap/utils/exerciseCatalog";
import type { WorkoutEditorState, WorkoutEditorTab } from "../hooks/useWorkoutEditor";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import ExerciseDefinitionChoiceDialog from "@/features/workout/components/ExerciseDefinitionChoiceDialog";
import {
  getExerciseIdentityInfoId,
  getExerciseIdentityName,
  getExerciseIdentityVariant,
  isCustomExerciseIdentity,
} from "@/features/workout/entries/types/ExerciseIdentity";

export type WorkoutEditorViewProps = WorkoutEditorState & {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  subtitleIcon?: LucideIcon;
};

function InitialDetails({
  form,
  shouldShowError,
  categoryOptions,
}: {
  form: WorkoutEditorViewProps["form"];
  shouldShowError: WorkoutEditorViewProps["shouldShowError"];
  categoryOptions: string[];
}) {
  return (
    <div className="space-y-4 px-1">
      <div className="space-y-3 pt-2">
        <Section title="Workout Name">
          <FormField
            control={form.control}
            name="workoutName"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-2">
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="e.g., Push Day A"
                    aria-label="Workout Name"
                    className={cn(
                      shouldShowError(
                        fieldState.isTouched,
                        !!fieldState.error,
                      ) && "border-red-500",
                    )}
                  />
                </FormControl>
                {shouldShowError(
                  fieldState.isTouched,
                  !!fieldState.error,
                ) ? (
                  <FormMessage className="ml-1 text-xs" />
                ) : null}
              </FormItem>
            )}
          />
        </Section>

        <Section title="Workout Type">
          <FormField
            control={form.control}
            name="workoutCategory"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-2">
                <FormControl>
                  <WorkoutCategoryField
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    isInvalid={shouldShowError(
                      fieldState.isTouched,
                      !!fieldState.error,
                    )}
                    options={categoryOptions}
                  />
                </FormControl>
                {shouldShowError(
                  fieldState.isTouched,
                  !!fieldState.error,
                ) ? (
                  <FormMessage className="ml-1 text-xs" />
                ) : null}
              </FormItem>
            )}
          />
        </Section>
      </div>
    </div>
  );
}

function PickerStep({
  fields,
  exercises,
  isExerciseValid,
  openExercise,
  handleAddCatalogExercise,
  handleAddTypedExercise,
  suggestedExercises,
  handleReorderExercises,
  handleRemoveExerciseFromPicker,
}: {
  fields: WorkoutEditorState["fields"];
  exercises: WorkoutEditorExerciseValues[];
  isExerciseValid: (index: number) => boolean;
  openExercise: (index: number) => void;
  handleAddCatalogExercise: (exercise: ExerciseInfoCatalogItem) => void;
  handleAddTypedExercise: (exerciseName: string) => void;
  suggestedExercises: ExerciseInfoCatalogItem[];
  handleReorderExercises: (fromIndex: number, toIndex: number) => void;
  handleRemoveExerciseFromPicker: (index: number) => void;
}) {
  const sortableExercises = fields.map((field, index) => ({
    id: field.id,
    exercise: exercises[index]!,
  }));

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-primary/20 bg-card p-4">
          <ExerciseCatalogPicker
            label="Search exercises"
            helperText="Tap Add and we’ll open the new exercise straight away so you can confirm or tweak it right there."
            placeholder="Search exercises"
            actionLabel="Add"
            emptyMessage="No matching exercise found."
            autoFocus
            showInitialResults
            onUseTypedQuery={handleAddTypedExercise}
            onSelect={handleAddCatalogExercise}
          />
        </div>

        {suggestedExercises.length > 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">
              Quick picks
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a common lift in one tap, then edit the new row immediately.
              Use search above if you need a specific variation or want to add
              the same lift again.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {suggestedExercises.map((exercise) => {
                const metadata =
                  getExerciseCatalogDisplayMetadata(exercise);
                return (
                  <DashCardRow
                    key={exercise.id}
                    label={exercise.name}
                    description={metadata || "Catalog exercise"}
                    onClick={() => handleAddCatalogExercise(exercise)}
                    icon={Plus}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          Need a specific variation? Choose it in search before opening an
          exercise.
        </p>
      </div>

      <Section
        title="Exercises"
        icon={Hash}
        subtitle="Drag to reorder or open one to make changes."
        divided={false}
      >
        <DndExercises
          exercises={sortableExercises}
          isExerciseValid={isExerciseValid}
          onOpenExercise={openExercise}
          onRemoveExercise={handleRemoveExerciseFromPicker}
          onReorder={handleReorderExercises}
          getExerciseTitle={(exercise, index) =>
            getExerciseIdentityName(exercise.identity).trim() || `Exercise ${index + 1}`
          }
          getExerciseMeta={(exercise) =>
            getExerciseIdentityVariant(exercise.identity)?.trim()
              ? `${getExerciseIdentityVariant(exercise.identity)} - ${exercise.goalSets} sets`
              : `${exercise.goalSets} sets`
          }
          getExerciseBadge={(exercise) =>
            exercise.focus ? (
              <Badge className="border-primary/20 bg-primary/10 text-primary">
                Focused
              </Badge>
            ) : null
          }
        />
      </Section>
    </div>
  );
}

function CurrentExercisePanel({
  currentExercise,
  currentExerciseIndex,
  shouldShowVariantInput,
  form,
  shouldShowError,
  stepGoalSets,
  setExerciseFocus,
  handleRemoveCurrentExercise,
  onDone,
  currentExerciseHasChanges,
}: {
  currentExercise: WorkoutEditorExerciseValues;
  currentExerciseIndex: number;
  shouldShowVariantInput: boolean;
  form: WorkoutEditorViewProps["form"];
  shouldShowError: WorkoutEditorViewProps["shouldShowError"];
  stepGoalSets: WorkoutEditorViewProps["stepGoalSets"];
  setExerciseFocus: WorkoutEditorViewProps["setExerciseFocus"];
  handleRemoveCurrentExercise: () => void;
  onDone: () => void;
  currentExerciseHasChanges: boolean;
}) {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Current exercise
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is the exercise you most recently opened from the picker.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            icon={CheckCircle2}
            type="button"
            size="sm"
            onClick={onDone}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            disabled={!currentExerciseHasChanges}
            title="Done editing this exercise"
          >
            Done
          </Button>
          <Button
            icon={undefined}
            type="button"
            size="sm"
            onClick={handleRemoveCurrentExercise}
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Remove exercise from session"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>

      <Section
        title="Exercise details"
        icon={Dumbbell}
        subtitle="Adjust the movement before saving the workout."
      >
        <div className="space-y-6 pt-2">
          <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                  Exercise
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {getExerciseIdentityName(currentExercise.identity)}
                </p>
                {getExerciseIdentityVariant(currentExercise.identity)?.trim() ? (
                  <p className="text-sm text-muted-foreground">
                    {getExerciseIdentityVariant(currentExercise.identity)}
                  </p>
                ) : null}
                {currentExercise.focus ? (
                  <Badge className="mt-3 border-primary/20 bg-primary/10 text-primary">
                    Focused
                  </Badge>
                ) : null}
              </div>
              <Button
                icon={undefined}
                type="button"
                size="sm"
                onClick={() =>
                  setExerciseFocus(currentExerciseIndex, !currentExercise.focus)
                }
                className={
                  currentExercise.focus
                    ? "border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-background hover:bg-muted/50"
                }
                aria-pressed={currentExercise.focus}
                title={currentExercise.focus ? "Clear focus" : "Mark as focus"}
              >
                {currentExercise.focus ? "Clear focus" : "Mark as focus"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Focus tells analysis and coaching which exercise matters most.
              Change the name by removing this exercise and adding it again
              from the picker.
            </p>
          </div>

          {shouldShowVariantInput ? (
            <FormField
              control={form.control}
              name={`exercises.${currentExerciseIndex}.identity.variant`}
              render={({ field, fieldState }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Variant
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="text"
                      placeholder="e.g., Incline, DB, Pause"
                      aria-label="Variant"
                      className={cn(
                        "h-12 bg-transparent px-4 text-base shadow-none",
                        shouldShowError(
                          fieldState.isTouched,
                          !!fieldState.error,
                        ) && "border-red-500",
                      )}
                    />
                  </FormControl>
                  {shouldShowError(
                    fieldState.isTouched,
                    !!fieldState.error,
                  ) ? (
                    <FormMessage className="ml-1 text-xs" />
                  ) : null}
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={form.control}
            name={`exercises.${currentExerciseIndex}.goalSets`}
            render={({ field, fieldState }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Goal Sets
                </FormLabel>
                <ButtonGroup className="h-12 w-full">
                  <Button
                    icon={undefined}
                    type="button"
                    size="icon"
                    onClick={() => stepGoalSets(currentExerciseIndex, "down")}
                    className="h-full w-14 border-r-0 bg-transparent"
                    title="Decrease goal sets"
                    aria-label="Decrease goal sets"
                  >
                    <span className="text-lg">-</span>
                  </Button>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      aria-label="Goal Sets"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) =>
                        field.onChange(
                          Number.parseInt(event.target.value, 10) || 0,
                        )
                      }
                      className={cn(
                        "h-full rounded-none border-x-0 bg-transparent text-center text-lg font-bold",
                        shouldShowError(
                          fieldState.isTouched,
                          !!fieldState.error,
                        ) && "border-red-500",
                      )}
                    />
                  </FormControl>
                  <Button
                    icon={undefined}
                    type="button"
                    size="icon"
                    onClick={() => stepGoalSets(currentExerciseIndex, "up")}
                    className="h-full w-14 border-l-0 bg-transparent"
                    title="Increase goal sets"
                    aria-label="Increase goal sets"
                  >
                    <span className="text-lg">+</span>
                  </Button>
                </ButtonGroup>
                {shouldShowError(
                  fieldState.isTouched,
                  !!fieldState.error,
                ) ? (
                  <FormMessage className="ml-1 text-xs" />
                ) : null}
              </FormItem>
            )}
          />
        </div>
      </Section>
    </div>
  );
}

export function WorkoutEditorView({
  title,
  subtitle,
  icon,
  subtitleIcon,
  form,
  workoutName,
  workoutCategory,
  fields,
  categoryOptions,
  shouldShowError,
  stepGoalSets,
  setExerciseFocus,
  handleSubmitClick,
  resetForm,
  isExerciseValid,
  activeTab,
  setActiveTab,
  exercises,
  currentExerciseIndex,
  currentExercise,
  shouldShowVariantInput,
  suggestedExercises,
  canSubmit,
  currentExerciseHasChanges,
  finalSaveLabel,
  finalUndoLabel,
  openExercise,
  handleAddCatalogExercise,
  handleAddTypedExercise,
  definitionChoice,
  confirmDefinitionChoice,
  closeDefinitionChoice,
  handleRemoveCurrentExercise,
  handleRemoveExerciseFromPicker,
  handleReorderExercises,
}: WorkoutEditorViewProps) {
  const shouldShowValidationErrors = form.formState.isDirty || form.formState.submitCount > 0;
  const workoutNameMissing = workoutName.trim().length === 0;
  const workoutCategoryMissing = workoutCategory.trim().length === 0;
  const currentExerciseMissing =
    currentExerciseIndex >= 0 && currentExercise
      ? getExerciseIdentityName(currentExercise.identity).trim().length === 0 ||
        currentExercise.goalSets < 1 ||
        (!isCustomExerciseIdentity(currentExercise.identity) &&
          getExerciseIdentityInfoId(currentExercise.identity) == null)
      : false;
  const otherExerciseMissing = exercises.some((exercise, index) => {
    if (index === currentExerciseIndex) return false;

    return (
      getExerciseIdentityName(exercise.identity).trim().length === 0 ||
      exercise.goalSets < 1 ||
      (!isCustomExerciseIdentity(exercise.identity) &&
        getExerciseIdentityInfoId(exercise.identity) == null)
    );
  });

  const tabs = useMemo(
    () =>
      [
        {
          key: "details" as WorkoutEditorTab,
          label: "Initial details",
          error: shouldShowValidationErrors && (workoutNameMissing || workoutCategoryMissing),
        },
        {
          key: "picker" as WorkoutEditorTab,
          label: "Picker",
          error:
            shouldShowValidationErrors && (exercises.length === 0 || otherExerciseMissing),
        },
        {
          key: "exercise" as WorkoutEditorTab,
          label: "Exercise",
          error: shouldShowValidationErrors && currentExerciseMissing,
          disabled: !currentExercise,
        },
      ],
    [
      currentExercise,
      currentExerciseMissing,
      exercises.length,
      otherExerciseMissing,
      shouldShowValidationErrors,
      workoutCategoryMissing,
      workoutNameMissing,
    ],
  );

  return (
    <Form {...form}>
      <FormPage
        title={title}
        subtitle={subtitle}
        icon={icon}
        subtitleIcon={subtitleIcon}
        hasChanges={form.formState.isDirty}
        isSaving={false}
        isValid={canSubmit}
        onSave={handleSubmitClick}
        onReset={resetForm}
        saveLabel={finalSaveLabel}
        undoLabel={finalUndoLabel}
        disableSaveOnInvalid={false}
      >
        <div className="space-y-4">
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            ariaLabel="Workout editor tabs"
            onTabChange={setActiveTab}
          />

          {activeTab === "details" ? (
            <InitialDetails
              form={form}
              shouldShowError={shouldShowError}
              categoryOptions={categoryOptions}
            />
          ) : null}

          {activeTab === "picker" ? (
            <PickerStep
              fields={fields}
              exercises={exercises}
              isExerciseValid={isExerciseValid}
              openExercise={openExercise}
              handleAddCatalogExercise={handleAddCatalogExercise}
              handleAddTypedExercise={handleAddTypedExercise}
              suggestedExercises={suggestedExercises}
              handleReorderExercises={handleReorderExercises}
              handleRemoveExerciseFromPicker={handleRemoveExerciseFromPicker}
            />
          ) : null}

          {activeTab === "exercise" && currentExercise ? (
            <CurrentExercisePanel
              currentExercise={currentExercise}
              currentExerciseIndex={currentExerciseIndex}
              shouldShowVariantInput={shouldShowVariantInput}
              form={form}
              shouldShowError={shouldShowError}
              stepGoalSets={stepGoalSets}
              setExerciseFocus={setExerciseFocus}
              handleRemoveCurrentExercise={handleRemoveCurrentExercise}
              onDone={() => setActiveTab("picker")}
              currentExerciseHasChanges={currentExerciseHasChanges}
            />
          ) : null}
        </div>

        <ExerciseDefinitionChoiceDialog
          open={definitionChoice != null}
          onOpenChange={(open) => {
            if (!open) {
              closeDefinitionChoice();
            }
          }}
          matches={definitionChoice?.matches ?? []}
          suggestedDefinitionId={definitionChoice?.suggestedDefinitionId ?? null}
          onConfirm={confirmDefinitionChoice}
        />
      </FormPage>
    </Form>
  );
}

function WorkoutCategoryField({
  value,
  onChange,
  onBlur,
  isInvalid,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  isInvalid: boolean;
  options: string[];
}) {
  const [selectMode, setSelectMode] = useState(!value);

  const handleSelectChange = (val: string) => {
    onChange(val);
    onBlur();
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-3">
        {selectMode ? (
          <Select
            value={value || undefined}
            onValueChange={handleSelectChange}
            onOpenChange={(open) => {
              if (!open) onBlur();
            }}
          >
            <SelectTrigger
              onBlur={onBlur}
              aria-label="Workout Type"
              aria-invalid={isInvalid}
              className={cn(
                isInvalid && "bg-red-50 dark:bg-red-950/20 border-red-500",
              )}
            >
              <SelectValue placeholder="Choose workout type" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {options.length > 0 ? (
                options.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    className="cursor-pointer py-3 text-base md:text-sm"
                  >
                    {option}
                  </SelectItem>
                ))
              ) : (
                <div className="ui-empty-message py-6">
                  No workout types available
                </div>
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder="Choose workout type"
            aria-label="Workout Type"
            aria-invalid={isInvalid}
          />
        )}
        <Button
          icon={undefined}
          onClick={() => setSelectMode((m) => !m)}
          type="button"
          aria-label={
            selectMode ? "Switch to create mode" : "Switch to select mode"
          }
          title={selectMode ? "Switch to create mode" : "Switch to select mode"}
        >
          {selectMode ? (
            <>
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Create</span>
            </>
          ) : (
            <>
              <List className="h-5 w-5" />
              <span className="hidden sm:inline">Select</span>
            </>
          )}
        </Button>
      </div>
      <p className="ui-text-muted px-1">
        {selectMode
          ? "Choose an existing workout type"
          : "Create a new workout type"}
      </p>
    </div>
  );
}
