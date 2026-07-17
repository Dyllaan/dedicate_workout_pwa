import type { ReactNode } from "react";
import { RotateCcw, Save } from "lucide-react";
import { ICONS } from "@/config/iconConfig";
import TabShell from "@/components/tabs/TabShell";
import type { TabItem } from "@/components/tabs/TabBar";
import Page from "@/components/layout/frames/Page";
import { Button } from "@/components/ui/button";

interface WorkoutEntryShellProps<T extends string> {
  title: string;
  subtitle?: string;
  hasChanges: boolean;
  isValid: boolean;
  submitting: boolean;
  handleSubmit: () => void | Promise<void>;
  onReset?: () => void;
  saveLabel?: string;
  undoLabel?: string;
  tabs?: TabItem<T>[];
  activeTab?: T;
  ariaLabel?: string;
  onTabChange?: (tab: T) => void;
  onDisabledTabClick?: (tab: T) => void;
  topContent?: ReactNode;
  children: ReactNode;
}

export default function WorkoutEntryShell<T extends string>({
  title,
  subtitle,
  hasChanges,
  isValid,
  submitting,
  handleSubmit,
  onReset,
  saveLabel,
  undoLabel,
  tabs,
  activeTab,
  ariaLabel,
  onTabChange,
  onDisabledTabClick,
  topContent,
  children,
}: WorkoutEntryShellProps<T>) {
  const showTabs = Boolean(tabs && activeTab && onTabChange);
  const showActions = Boolean(saveLabel !== undefined || onReset);
  const actions = showActions ? (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      {onReset ? (
        <Button
          icon={RotateCcw}
          type="button"
          onClick={onReset}
          variant="destructive"
          disabled={!hasChanges}
        >
          {undoLabel ?? "Reset"}
        </Button>
      ) : null}

      <Button
        icon={Save}
        type="button"
        onClick={handleSubmit}
        title={submitting ? "Saving workout" : saveLabel ?? "Save workout"}
        disabled={submitting || !hasChanges || !isValid}
      >
        {submitting ? "Saving..." : saveLabel ?? "Save"}
      </Button>
    </div>
  ) : null;

  return (
    <Page
      title={title}
      subtitle={subtitle}
      icon={ICONS.workout}
      actions={actions}
    >
      {showTabs ? (
        <TabShell
          tabs={tabs as TabItem<T>[]}
          activeTab={activeTab as T}
          ariaLabel={ariaLabel ?? title}
          onTabChange={onTabChange as (tab: T) => void}
          onDisabledTabClick={onDisabledTabClick}
          contentClassName="contents"
        >
          <div className="space-y-4 py-4">
            {topContent}
            {children}
          </div>
        </TabShell>
      ) : (
        <div className="space-y-4 py-4">
          {topContent}
          {children}
        </div>
      )}
    </Page>
  );
}