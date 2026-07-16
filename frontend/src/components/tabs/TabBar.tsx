import { cn } from "@/lib/utils";

export type TabItem<T extends string> = {
  key: T;
  label: string;
  disabled?: boolean;
  error?: boolean;
};

type TabBarProps<T extends string> = {
  tabs: TabItem<T>[];
  activeTab: T;
  ariaLabel: string;
  onTabChange: (tab: T) => void;
  onDisabledTabClick?: (tab: T) => void;
};

export default function TabBar<T extends string>({
  tabs,
  activeTab,
  ariaLabel,
  onTabChange,
  onDisabledTabClick,
}: TabBarProps<T>) {
  return (
    <div className="flex border-b bg-background" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          aria-invalid={tab.error || undefined}
          aria-disabled={tab.disabled || undefined}
          onClick={() => {
            if (tab.disabled) {
              onDisabledTabClick?.(tab.key);
              return;
            }

            onTabChange(tab.key);
          }}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors",
            tab.disabled
              ? "cursor-not-allowed text-muted-foreground/70 hover:text-muted-foreground/70"
              : activeTab === tab.key
                ? tab.error
                  ? "border-b-2 border-destructive text-destructive"
                  : "border-b-2 border-primary text-primary"
                : tab.error
                  ? "border-b-2 border-destructive/40 text-destructive hover:text-destructive"
                  : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
