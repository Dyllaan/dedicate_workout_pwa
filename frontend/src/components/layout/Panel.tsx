import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import SectionHeader from "@/components/layout/SectionHeader";
import { cn } from "@/lib/utils";

interface PanelProps {
  icon?: LucideIcon;
  title?: ReactNode;
  button?: {
    label?: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost" | "secondary";
  };
  action?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  subtitle?: string;
  className?: string;
  divided?: boolean;
}

export default function Panel({
  icon,
  title,
  button,
  action,
  actions,
  children,
  subtitle,
  className,
  divided = false,
  ...rest
}: PanelProps) {
  return (
    <div {...rest} className={cn("ui-section p-0", className)}>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} button={button} action={action ?? actions} />
      <div className={cn("space-y-4 mb-4", divided && "divide-y divide-border")}>
        {children}
      </div>
    </div>
  );
}
