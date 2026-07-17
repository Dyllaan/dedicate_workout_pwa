import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps {
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  trigger?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  icon?: LucideIcon;
  className?: string;
  headerClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
}

export default function CollapsiblePanel({
  title,
  description,
  meta,
  actions,
  trigger,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  icon: Icon,
  className,
  headerClassName,
  triggerClassName,
  contentClassName,
  iconContainerClassName,
  iconClassName,
}: CollapsiblePanelProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn("overflow-hidden rounded-2xl border border-border", className)}
    >
      <div className={cn("p-2 border-b border-border bg-card", headerClassName)}>
        <div className="flex items-start gap-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-w-0 flex-1 items-start gap-3 text-left transition-colors hover:text-foreground",
                triggerClassName,
              )}
            >
              {trigger ? (
                <div className="flex flex-row items-center justify-between w-full hover:bg-muted/20 rounded-lg">
                  <div className="min-w-0 flex-1">{trigger}</div>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </div>
              ) : (
                <>
                  {Icon && (
                    <div className={cn("rounded-lg bg-card p-2", iconContainerClassName)}>
                      <Icon className={cn("h-5 w-5 text-primary", iconClassName)} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0 flex-1">
                        {title && <div className="font-semibold text-foreground">{title}</div>}
                      </div>
                      {meta && <div className="shrink-0">{meta}</div>}
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                      />
                    </div>
                    <div className="ui-text-caption">{description}</div>
                  </div>
                </>
              )}
            </button>
          </CollapsibleTrigger>

          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>

      <CollapsibleContent>
        <div className={cn("space-y-4 rounded-2xl p-2 mx-4 mb-4", contentClassName)}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
