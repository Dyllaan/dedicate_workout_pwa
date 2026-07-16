import type { ReactNode } from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";

import EmptyState from "@/components/layout/feedback/EmptyState";

interface ErrorStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export default function ErrorState({
  title,
  description,
  action,
  icon = AlertTriangle,
  className,
}: ErrorStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={action}
      icon={icon}
      className={className}
    />
  );
}
