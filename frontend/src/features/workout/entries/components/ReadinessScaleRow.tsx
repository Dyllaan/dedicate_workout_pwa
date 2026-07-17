import type { LucideIcon } from "lucide-react";
import { SelectionChip } from "@/components/ui/selection-chip";

export default function ReadinessScaleRow({
    label,
    value,
    onChange,
    icon: Icon,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    icon: LucideIcon;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4" />
                    {label}
                </p>
            </div>
            <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                    <SelectionChip
                        key={score}
                        size="sm"
                        selected={value === score}
                        onClick={() => onChange(score)}
                        className="min-w-9 px-3"
                    >
                        {score}
                    </SelectionChip>
                ))}
            </div>
        </div>
    );
}
