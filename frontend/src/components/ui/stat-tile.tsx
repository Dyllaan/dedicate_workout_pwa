import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils.ts";

type StatTileProps = {
    label: string;
    value?: ReactNode;
    supportingText?: ReactNode;
    icon?: LucideIcon | React.ComponentType<{ className?: string }>;
    size?: "sm" | "default";
    variant?: "default" | "double" | "full"; // Added variant prop
    className?: string;
    labelClassName?: string;
    valueClassName?: string;
    tint?: string;
    onClick?: () => void;
};

export default function StatTile({
                                     label,
                                     value,
                                     supportingText,
                                     icon: Icon,
                                     className,
                                     labelClassName,
                                     valueClassName,
                                     tint,
                                     onClick,
                                     size = "default",
                                     variant = "default", // Defaulting to normal size
                                 }: StatTileProps) {
    const disabled = value === undefined || value === null;
    const compact = size === "sm";

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative flex flex-col justify-between rounded-2xl border border-muted/40 bg-card transition-all duration-200 hover:border-primary/20 hover:shadow-sm",
                compact ? "p-3" : "p-4 sm:p-5",
                // Conditional column spanning
                variant === "double" && "col-span-2",
                variant === "full" && "col-span-full",
                className
            )}
        >
            {tint && (
                <div className={cn("absolute inset-0 rounded-2xl pointer-events-none opacity-5", tint)} />
            )}

            <div className="relative flex items-start justify-between gap-2 mb-3">
                <span
                    className={cn(
                        compact ? "text-[11px]" : "text-xs",
                    "font-medium text-muted-foreground tracking-normal truncate max-w-[80%]",
                        labelClassName
                    )}
                >
                    {label}
                </span>
                {!compact && Icon ? (
                    <div className="rounded-lg bg-secondary/50 p-1.5 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                    </div>
                ) : null}
            </div>

            <div className="relative flex items-baseline">
                <span
                    className={cn(
                        compact ? "text-lg" : "text-2xl sm:text-3xl",
                        "font-semibold tracking-tight text-foreground tabular-nums",
                        valueClassName,
                        disabled && "text-muted-foreground/40"
                    )}
                >
                    {value ?? "--"}
                </span>
            </div>

            {supportingText ? (
                <div className={cn("relative mt-1 leading-tight text-muted-foreground", compact ? "text-[10px]" : "text-xs", disabled && "text-muted-foreground/40")}>
                    {supportingText}
                </div>
            ) : null}
        </div>
    );
}