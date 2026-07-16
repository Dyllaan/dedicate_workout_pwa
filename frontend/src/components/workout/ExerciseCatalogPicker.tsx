import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useExerciseInfoCatalog } from "@/hooks/workout/useMuscleHeatmap";
import type { ExerciseInfoCatalogItem } from "@/types/Heatmap";
import { getExerciseCatalogDisplayMetadata } from "@/utils/exerciseCatalog";
import Section from "@/components/layout/Section";
import { DashCardRow } from "../layout/card/DashCardRow";

type ExerciseCatalogPickerProps = {
  label?: string;
  helperText?: string;
  placeholder?: string;
  initialQuery?: string;
  selectedExerciseInfoId?: number | null;
  actionLabel?: string;
  emptyMessage?: string;
  limit?: number;
  className?: string;
  autoFocus?: boolean;
  showInitialResults?: boolean;
  onUseTypedQuery?: (query: string) => void;
  onSelect: (exercise: ExerciseInfoCatalogItem) => void;
};

export default function ExerciseCatalogPicker({
  label = "Search exercises",
  helperText,
  placeholder = "Search exercises",
  initialQuery = "",
  selectedExerciseInfoId = null,
  actionLabel = "Choose",
  emptyMessage = "No exercises found.",
  limit = 8,
  autoFocus = false,
  showInitialResults = false,
  onUseTypedQuery,
  onSelect,
}: ExerciseCatalogPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, 300, showInitialResults ? initialQuery : "");
  const trimmedQuery = query.trim();
  const hasTypedQuery = trimmedQuery.length > 0;
  const { data: catalog = [], isLoading } = useExerciseInfoCatalog(debouncedQuery, limit, {
    enabledWhenEmpty: showInitialResults,
  });
  const showTypedQueryAction = !!onUseTypedQuery && trimmedQuery.length > 0;

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  return (
    <Section title={label} subtitle={helperText}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
          autoFocus={autoFocus}
        />
      </div>

      <div className="grid gap-2 divide-y">
        {isLoading ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">
            Loading exercises...
          </div>
        ) : null}
        {catalog.map((exercise) => {
          const selected = selectedExerciseInfoId === exercise.id;
          const metadata = getExerciseCatalogDisplayMetadata(exercise);

          return (
            <DashCardRow
              key={exercise.id}
              label={exercise.name}
              description={metadata || "Catalog exercise"}
              actionLabel={selected ? "Selected" : actionLabel}
              onClick={() => onSelect(exercise)}
              icon={Plus}
              className={selected ? "bg-primary/5" : undefined}
            />
          );
        })}

        {showTypedQueryAction ? (
          <button
            type="button"
            aria-label={trimmedQuery}
            onClick={() => onUseTypedQuery?.(trimmedQuery)}
            className="rounded-xl border border-dashed border-border bg-background px-4 py-4 text-left transition-colors hover:bg-muted/40"
          >
            <p className="text-sm font-semibold text-foreground">{trimmedQuery}</p>
            <p className="mt-1 text-xs text-muted-foreground">Use custom exercise name</p>
          </button>
        ) : null}

        {hasTypedQuery && !isLoading && catalog.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : null}
      </div>
    </Section>
  );
}
