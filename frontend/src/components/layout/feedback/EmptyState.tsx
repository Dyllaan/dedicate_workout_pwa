import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export default function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={cn("ui-feedback-panel text-center", compact ? "py-8" : "py-10", className)}>
      <div className="flex flex-col items-center gap-3">
        {Icon ? (
          <div className="ui-feedback-icon">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : null}
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description ? <p className="ui-text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}
