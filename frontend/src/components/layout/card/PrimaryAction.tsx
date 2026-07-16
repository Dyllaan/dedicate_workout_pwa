import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAccentStyle, type AccentColor } from "@/hooks/useAccentStyle";

type PrimaryActionProps = {
    icon?: LucideIcon | React.ComponentType<{ className?: string }>;
    accentColor?: AccentColor;
    overline?: string;
    label: string;
    description?: string;
    onClick?: () => void;
    to?: string;
    className?: string;
    children?: React.ReactNode;
    badge?: React.ReactNode;
};

export function PrimaryAction({
                                  icon: Icon,
                                  accentColor = "emerald",
                                  overline,
                                  label,
                                  description,
                                  onClick,
                                  className = "",
                                  children,
                                  badge,
                                  to,
                              }: PrimaryActionProps) {
    const navigate = useNavigate();
    const { gradientColors, iconStroke } = useAccentStyle(accentColor);

    const doAction = () => {
        if (to) {
            navigate(to);
        } else if (onClick) {
            onClick();
        }
    };

    return (
        <div className="w-full">
            <div className={`w-full h-36 p-[2px] rounded-xl bg-gradient-to-r ${gradientColors} animate-gradient-shift`}>
                <button
                    onClick={doAction}
                    className={`
                        w-full h-full text-left block rounded-[10px] bg-card
                        p-4 px-6
                        transition-colors cursor-pointer group
                        ${className}
                    `}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                            {overline && (
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    {overline}
                                </p>
                            )}

                            <h2 className="break-words text-lg font-bold leading-snug text-foreground flex items-center gap-2">
                                {Icon && (
                                    <Icon
                                        className="h-7 w-7 shrink-0 transition-transform duration-300 group-hover:scale-105"
                                        stroke={iconStroke}
                                    />
                                )}

                                <span className="text-md font-light text-zinc-400 leading-snug">
                                    {label}
                                </span>
                            </h2>

                            {description && (
                                <p className="break-words text-sm leading-relaxed text-muted-foreground mt-1">
                                    {description}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 self-center">
                            <div>{badge}</div>
                            <div className="text-muted-foreground/40 shrink-0 self-center transition-transform duration-200 group-hover:translate-x-1">
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                    {children && <div className="w-full mt-2">{children}</div>}
                </button>
            </div>
        </div>
    );
}