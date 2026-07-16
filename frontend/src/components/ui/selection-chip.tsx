import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectionChipProps = Omit<ComponentProps<"button">, "type"> & {
  selected: boolean;
  icon?: LucideIcon;
  size?: "sm" | "default";
};

export function SelectionChip({
  selected,
  icon: Icon,
  size = "default",
  className,
  children,
  ...props
}: SelectionChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
        selected
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-background/80 text-foreground hover:bg-muted/50",
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
