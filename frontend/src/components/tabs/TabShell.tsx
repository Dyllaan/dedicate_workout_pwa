import type { ReactNode } from "react";
import TabBar, { type TabItem } from "./TabBar";
import {cn} from "@/lib/utils.ts";

type TabShellProps<T extends string> = {
  tabs: TabItem<T>[];
  activeTab: T;
  ariaLabel: string;
  onTabChange: (tab: T) => void;
  onDisabledTabClick?: (tab: T) => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function TabShell<T extends string>({
  tabs,
  activeTab,
  ariaLabel,
  onTabChange,
  onDisabledTabClick,
  children,
  className,
  contentClassName = "space-y-4 flex flex-col",
}: TabShellProps<T>) {
  return (
    <div className={cn("space-y-4", className)}>
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        ariaLabel={ariaLabel}
        onTabChange={onTabChange}
        onDisabledTabClick={onDisabledTabClick}
      />
      <div className={cn(contentClassName)}>{children}</div>
    </div>
  );
}
