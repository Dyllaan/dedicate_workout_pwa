import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils.ts";

type StatTileProps = {
    label: string;
    value?: ReactNode;
    supportingText?: ReactNode;
    icon?: LucideIcon | React.ComponentType<{ className?: string }>;
    className?: string;
    labelClassName?: string;
    valueClassName?: string;
    tint?: string;
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
                                 }: StatTileProps) {
    const disabled = value === undefined || value === null;

    return (
        <div
            className={cn(
                "group relative flex flex-col justify-between rounded-2xl border border-muted/40 bg-card p-4 sm:p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-sm",
                className
            )}
        >
            {tint && (
                <div className={cn("absolute inset-0 rounded-2xl pointer-events-none opacity-5", tint)} />
            )}

            <div className="relative flex items-start justify-between gap-2 mb-3">
                <span
                    className={cn(
                        "text-xs font-medium text-muted-foreground tracking-normal truncate max-w-[80%]",
                        labelClassName
                    )}
                >
                    {label}
                </span>
                {Icon ? (
                    <div className="rounded-lg bg-secondary/50 p-1.5 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                    </div>
                ) : null}
            </div>

            <div className="relative flex items-baseline">
                <span
                    className={cn(
                        "text-2xl sm:text-3xl font-semibold tracking-tight text-foreground tabular-nums",
                        valueClassName,
                        disabled && "text-muted-foreground/40"
                    )}
                >
                    {value ?? "--"}
                </span>
            </div>

            {supportingText ? (
                <div className={cn("relative mt-1 text-xs leading-tight text-muted-foreground", disabled && "text-muted-foreground/40")}>
                    {supportingText}
                </div>
            ) : null}
        </div>
    );
}