import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  icon?: LucideIcon;
  title: string;
  summary?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
};

export default function CollapsibleSection({
  icon: Icon,
  title,
  summary,
  defaultExpanded = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("rounded-2xl border border-border bg-card", className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/5 transition-colors rounded-2xl"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon ? <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : null}
          <span className="text-sm font-semibold text-foreground truncate">{title}</span>
          {summary && !expanded ? (
            <span className="text-xs text-muted-foreground truncate">· {summary}</span>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
