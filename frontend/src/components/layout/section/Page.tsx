import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageProps {
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  subtitleIcon?: LucideIcon;
  badge?: string | ReactNode;
  icon?: LucideIcon;
  childOfHeader?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  headerAfter?: ReactNode;
  variant?: "default" | "hero";
  contentClassName?: string;
  className?: string;
  actionDirection?: "column" | "row";
}

export default function Page({
  title,
  subtitle,
  subtitleIcon,
  badge,
  icon,
  children,
  childOfHeader,
  eyebrow,
  actions,
  headerAfter,
  variant = "default",
  contentClassName,
  className,
    actionDirection = "column",
}: PageProps) {
  return (
    <div className={cn("mx-auto w-full pt-2 space-y-4", className)}>
      <PageHeader
        title={title || ""}
        subtitle={subtitle}
        subtitleIcon={subtitleIcon}
        badge={badge}
        childOfHeader={childOfHeader}
        icon={icon}
        eyebrow={eyebrow}
        actions={actions}
        variant={variant}
        actionDirection={actionDirection}
      />
      {headerAfter ? (<div>{headerAfter}</div>) : null}
      <div className={cn("space-y-4 flex flex-col", contentClassName)}>{children}</div>
    </div>
  );
}

const PageHeader = ({
  title,
  subtitle,
  subtitleIcon,
  badge,
  childOfHeader,
  icon,
  eyebrow,
  actions,
  variant,
    actionDirection,
}: Omit<PageProps, "children">) => {
  const SubtitleIcon = subtitleIcon as React.ElementType;
  const Icon = icon as React.ElementType;
  const resolvedActions = actions ?? childOfHeader;
  const hero = variant === "hero";

  return (
    <div
      className={cn(
        "mx-auto flex gap-3 w-full justify-between",
          actionDirection === "column" ? "flex-col" : "flex-row items-start"
      )}
    >
      <div className="space-y-0.5 min-w-0">
        {eyebrow && (
          <p className="ui-text-kicker">
            {eyebrow}
          </p>
        )}
        <div className={cn("flex items-center gap-2.5", hero && "items-start")}>
          {icon && (
            <div
              className={cn(
                hero
                  ? "ui-page-hero-icon"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-transparent text-primary",
              )}
            >
              <Icon className={cn("shrink-0", hero ? "h-6 w-6 text-primary" : "h-5 w-5")} />
            </div>
          )}
          <h1 className={cn("font-bold text-foreground tracking-tight", hero ? "text-3xl leading-tight" : "text-2xl leading-none")}>
            {title}
          </h1>
          {badge && (
            typeof badge === "string" ? (
              <Badge variant="outline" className="gap-1.5 text-xs px-2.5 py-0.5">
                {badge}
              </Badge>
            ) : (
              badge
            )
          )}
        </div>
        {subtitle && (
          <div className="mt-2 flex flex-wrap items-start gap-1.5">
            {subtitleIcon && (
              <SubtitleIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <p className="ui-text-muted break-words">{subtitle}</p>
          </div>
        )}
      </div>
      {resolvedActions ? <div className="shrink-0">{resolvedActions}</div> : null}
    </div>
  );
};
