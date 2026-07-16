import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import DatePicker from "@/components/layout/input/DatePicker";
import ActiveIcon from "@/components/ui/ActiveIcon.tsx";

type DashCardRowBase = {
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  datetime?: string;
  actionLabel?: string;
  linkProps?: Omit<ComponentProps<typeof Link>, "to" | "className" | "children">;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  index?: number;
  defaultValue?: string;
  children?: React.ReactNode;
} & (
  | { variant: "active"; badge?: never }
  | { variant?: Exclude<"default" | "destructive" | "archived" | "outlined" | "trigger" | "static" | "datepicker", never>; badge?: string | React.ReactNode }
);

type DashCardRowProps =
  | (DashCardRowBase & { variant: "outlined"; to?: never; onClick?: never; onDateConfirm?: never, derived?: never })
  | (DashCardRowBase & { variant: "trigger" | "static"; to?: never; onClick?: never; onDateConfirm?: never, derived?: never })
  | (DashCardRowBase & { variant: "datepicker"; to?: never; onClick?: never; onDateConfirm: (iso: string) => void; derived?: boolean;})
  | (DashCardRowBase & { to?: string; onClick?: never; onDateConfirm?: never, derived?: never })
  | (DashCardRowBase & { onClick: () => void; to?: never; onDateConfirm?: never, derived?: never });

export function DashCardRow({
  to,
  onClick,
  icon: Icon,
  label,
  description,
  datetime,
  actionLabel = "",
  variant = "default",
  linkProps,
  badge,
  required = true,
  disabled = false,
  derived = false,
  className,
  children,
  index,
  onDateConfirm,
  defaultValue,
}: DashCardRowProps) {
  const isActive = variant === "active";
  const isDestructive = variant === "destructive";
  const isTrigger = variant === "trigger";
  const isStatic = variant === "static";
  const isDatePicker = variant === "datepicker";

  const inner = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`ml-2 p-2 rounded-lg ${isDestructive ? "bg-destructive/10" : "bg-muted/50"}`}>
            <Icon className={`h-5 w-5 ${isDestructive ? "text-destructive" : "text-muted-foreground"}`} />
          </div>
        )}
        {index !== undefined && (
          <div className="ml-2 px-2 py-1.5 rounded-xl bg-muted/50">
            <span className="h-5 w-5 font-bold text-muted-foreground">
              {index + 1}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${isDestructive ? "text-destructive" : "text-foreground"}`}>
            {label}
          </p>
          <div className="flex gap-2 items-center">
            {description && (
              <p className="text-xxs text-muted-foreground">{description}</p>
            )}
            {datetime && (
              <p className="text-xxs text-muted-foreground">{datetime}</p>
            )}
          </div>
        </div>
      </div>
      <span className="flex items-center gap-2 shrink-0">
        {isActive && (
          <ActiveIcon />
        )}
        {badge && typeof badge === 'string' ? (
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {badge}
          </span>
        ) : (
          <div className="pr-2">
            {badge}
          </div>
        )}
        {variant === "archived" && (
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Archived
          </span>
        )}
        {!isStatic && !isDatePicker && (
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground pr-2">
            {actionLabel}
            {!isTrigger && <ChevronRight className="h-5 w-5" />}
        </span>
        )}
      </span>
    </>
  );

  const sharedClassName =
    `${className || ""} flex mx-auto items-center justify-between gap-3 py-3 transition-colors ${!isTrigger && "hover:bg-muted/20"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50`;

  if (isTrigger) {
    return (
      <div className="block">
        <div className={`w-full ${sharedClassName}`}>
          {inner}
        </div>
        {children && <div className="w-full px-2">{children}</div>}
      </div>
    );
  }

  if (to && !disabled) {
    return (
      <div>
        <Link to={to} className="block" {...linkProps}>
          <div className={sharedClassName}>{inner}</div>
          {children && <div className="w-full px-2">{children}</div>}
        </Link>
      </div>
    );
  }

  if (onClick) {
    return (
      <div>
        <button
          onClick={onClick}
          className={`w-full text-left ${sharedClassName} ${variant === "outlined" ? "border border-primary/40 rounded-lg" : ""}`}
          disabled={isTrigger || isStatic ? undefined : disabled}
          type={isTrigger || isStatic ? "button" : undefined}
        >
          {inner}
        </button>
      </div>
    );
  }

  return (
    <div className={`block ${variant === "outlined" ? "border border-primary/40 rounded-lg" : ""}`}>
      <div className={`w-full ${sharedClassName}`}>
        {inner}
      </div>
      {isDatePicker && (
        <div className="w-full p-3">
          <DatePicker
            onConfirm={onDateConfirm!}
            disabled={disabled}
            variant={derived ? "derived" : "default"}
            required={required}
            value={defaultValue}
          />
        </div>
      )}
      {isStatic && children && <div className="w-full px-2">{children}</div>}
    </div>
  );
}