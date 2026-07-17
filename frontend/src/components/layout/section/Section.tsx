import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import SectionHeader from "@/components/layout/section/SectionHeader";
import { cn } from "@/lib/utils";

interface SectionProps {
  icon?: LucideIcon;
  title?: string;
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

export default function Section({ icon, title, button, action, actions, children, subtitle, className, divided=false }: SectionProps) {
  return (
    <div className={cn("ui-section", className)}>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} button={button} action={action ?? actions} />
      <div className={cn("flex flex-col gap-2", divided && "divide-y divide-border")}>
        {children}
      </div>
    </div>
  );
}
