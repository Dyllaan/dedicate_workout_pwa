import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, Merge, Shield, Trash2 } from "lucide-react";

import Page from "@/components/layout/frames/Page";
import Section from "@/components/layout/section/Section";
import { Button } from "@/components/ui/button";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import ConfirmDialog from "@/components/layout/dialog/ConfirmDialog";
import LoadingState from "@/components/layout/feedback/LoadingState";
import ErrorState from "@/components/layout/feedback/ErrorState";
import EmptyState from "@/components/layout/feedback/EmptyState";
import {
  useCollapseExerciseDefinitions,
  useExerciseDefinitionDuplicateGroups,
  type ExerciseDefinitionDuplicateGroup,
} from "@/features/workout/exercise-definitions/hooks/useExerciseDefinitionDuplicates";
import { cn } from "@/lib/utils";

function buildDefinitionLabel(definition: { exerciseName: string; variant?: string | null }) {
  return definition.variant?.trim()
    ? `${definition.exerciseName} · ${definition.variant}`
    : definition.exerciseName;
}

function buildMetaSummary(definition: { exerciseInfoId?: number | null; mappingSource: string }) {
  return [
    definition.exerciseInfoId != null ? `info ${definition.exerciseInfoId}` : "custom",
    definition.mappingSource,
  ].join(" · ");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never used";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DefinitionMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-[11px] leading-5 text-foreground">{value}</p>
    </div>
  );
}

function GroupSection({ group }: { group: ExerciseDefinitionDuplicateGroup }) {
  const collapseMutation = useCollapseExerciseDefinitions();
  const [canonicalId, setCanonicalId] = useState<string | null>(group.suggestedCanonicalDefinitionId);
  const [sourceIds, setSourceIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRowClick = (definitionId: string | null) => {
    if (!definitionId) return;

    if (!canonicalId) {
      setCanonicalId(definitionId);
      return;
    }

    if (definitionId === canonicalId) {
      setCanonicalId(null);
      setSourceIds(new Set());
      return;
    }

    setSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(definitionId)) {
        next.delete(definitionId);
      } else {
        next.add(definitionId);
      }
      return next;
    });
  };

  const handleMerge = async () => {
    if (!canonicalId || sourceIds.size === 0) return;
    await collapseMutation.mutateAsync({
      canonicalId,
      sourceDefinitionIds: Array.from(sourceIds),
    });
    setConfirmOpen(false);
  };

  const canonical = canonicalId ? group.definitions.find((definition) => definition.id === canonicalId) ?? null : null;
  const sourceCount = sourceIds.size;
  const readyToMerge = !!canonicalId && sourceCount > 0;

  const hint = !canonicalId
    ? "Tap the definition to keep."
    : sourceCount === 0
      ? "Now tap the duplicates to merge away."
      : undefined;

  return (
    <>
      <Section
        title={buildDefinitionLabel(group)}
        subtitle={group.exerciseInfoId != null
          ? `Catalog group info ${group.exerciseInfoId}`
          : "Custom identity group"}
        button={
          readyToMerge
            ? {
                label: `Merge ${sourceCount} into 1`,
                onClick: () => setConfirmOpen(true),
              }
            : undefined
        }
      >
        <div className="mb-3 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {hint ?? "Review the rows below. The selected keep row is the canonical definition id; the others will be collapsed into it."}
        </div>

        {group.definitions.map((definition) => {
          const isCanonical = definition.id != null && definition.id === canonicalId;
          const isSource = definition.id != null && sourceIds.has(definition.id);
          const isSuggestedCanonical = definition.id != null && definition.id === group.suggestedCanonicalDefinitionId;

          return (
            <div
              key={definition.id ?? `${definition.exerciseName}-${definition.variant ?? ""}`}
              className={cn(
                "rounded-xl",
                isCanonical && "bg-primary/5 outline outline-1 outline-primary/40",
                isSource && "bg-destructive/5 outline outline-1 outline-destructive/40",
              )}
            >
              <DashCardRow
                icon={isCanonical ? Shield : isSource ? Trash2 : Circle}
                label={buildDefinitionLabel(definition)}
                description={buildMetaSummary(definition)}
                badge={isCanonical ? (isSuggestedCanonical ? "Suggested keep" : "Keep") : isSource ? "Merge away" : canonicalId ? "Mark as duplicate" : "Keep this one"}
                disabled={definition.id == null}
                onClick={() => handleRowClick(definition.id)}
                actionLabel={isCanonical ? "Keep" : isSource ? "Remove" : canonicalId ? "Toggle" : "Keep"}
              />
              <div className="grid gap-2 px-3 pb-3 pt-1 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                <DefinitionMeta label="Mapping source" value={definition.mappingSource} />
                <DefinitionMeta label="Usage" value={`${definition.sessionCount} session${definition.sessionCount === 1 ? "" : "s"} · ${formatDateTime(definition.lastUsedAt)}`} />
              </div>
            </div>
          );
        })}
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Merge definitions?"
        description={
          canonical
            ? `Keep "${buildDefinitionLabel(canonical)}" (${canonical.id}) and delete ${sourceCount} duplicate${sourceCount === 1 ? "" : "s"} after moving their history across.`
            : "Select a definition to keep first."
        }
        confirmLabel="Merge"
        destructive
        isPending={collapseMutation.isPending}
        onConfirm={() => void handleMerge()}
      />
    </>
  );
}

export default function ExerciseDefinitionsManagePage() {
  const groupsQuery = useExerciseDefinitionDuplicateGroups();

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);

  return (
    <Page
      icon={Merge}
      title="Manage exercise definitions"
      headerAfter={(
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/insights?tab=lift" className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to lift detail
          </Link>
        </Button>
      )}
    >
      {groupsQuery.error ? (
        <Section>
          <ErrorState
            title="Could not load exercise definitions"
            description={groupsQuery.error instanceof Error ? groupsQuery.error.message : "Loading your exercise definitions failed."}
          />
        </Section>
      ) : null}
      {groupsQuery.isLoading ? (
        <Section>
          <LoadingState rows={4} />
        </Section>
      ) : groups.length === 0 ? (
        <Section>
          <EmptyState
            icon={CheckCircle2}
            title="No duplicate definitions found"
            description="All of your saved exercise definitions are already collapsed to the canonical rows."
          />
        </Section>
      ) : (
        groups.map((group) => (
          <GroupSection key={group.groupKey} group={group} />
        ))
      )}
    </Page>
  );
}
