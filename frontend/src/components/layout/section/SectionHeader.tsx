import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon?: LucideIcon;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  button?: {
    label?: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost" | "secondary";
  };
  className?: string;
}

export default function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  button,
  className,
}: SectionHeaderProps) {
  const resolvedAction = action ?? (
    button ? (
      <Button
        icon={button.icon}
        size="sm"
        onClick={button.onClick}
        className="h-8"
      >
        {button.label}
      </Button>
    ) : null
  );

  if (!Icon && !title && !subtitle && !resolvedAction) {
    return null;
  }

  return (
    <div className={cn("ui-section-header", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
            <div className={`ml-2 p-2 rounded-lg bg-card`}>
              <Icon className="h-3 w-3" />
            </div>
        ) : null}
        <div className="min-w-0">
          {title ? <h3 className="font-semibold text-sm text-muted-foreground">{title}</h3> : null}
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {resolvedAction ? <div className="shrink-0">{resolvedAction}</div> : null}
    </div>
  );
}
