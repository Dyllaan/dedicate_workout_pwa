import { Button } from "@/components/ui";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Save, Calendar } from "lucide-react";
import { enqueueSnackbar } from "notistack";

export default function DatePicker({
    onConfirm,
    disabled,
    className,
    variant = "default",
    required = true,
    value,
}: {
    onConfirm: (date: string) => void;
    disabled: boolean;
    className?: string;
    variant?: "default" | "derived";
    required?: boolean;
    value?: string;
}) {
    const [date, setDate] = useState(
        value 
            ? `${value.slice(0, 10)}T00:00:00Z` 
            : `${new Date().toISOString().slice(0, 10)}T00:00:00Z`
    );

    const [hasSaved, setHasSaved] = useState(false);

    const handleConfirm = async () => {
        if (!date) return;
        await onConfirm(date);
        setHasSaved(true);
    };

    const borderClass = (() => {
        if (required && variant === "derived") return "border-purple-400 hover:border-purple-400";
        if (!required) return "border-border hover:border-border";
        if (hasSaved) return "border-green-400 hover:border-green-400";
        return "border-red-400 hover:border-red-400";
    })();

    const displayDate = (() => {
        if (!date) return "DD MM YYYY";
        const [year, month, day] = date.slice(0, 10).split("-");
        return `${day} ${month} ${year}`;
    })();

    useEffect(() => {
        if (value) {
            setDate(value);
        }
    }, [value]);

    return (
        <div className={cn(disabled ? "pointer-events-none opacity-50" : "text-muted-foreground", "flex flex-row gap-2 justify-between", className)}>
            
            <div className="relative w-full h-10">
                <div className={cn("absolute inset-0 flex items-center justify-between px-3 bg-card border rounded-lg pointer-events-none transition-colors", borderClass)}>
                    <span className="text-sm font-medium text-foreground tracking-wide">{displayDate}</span>
                    <Calendar className="h-4 w-4 opacity-50" />
                </div>
                
                <input
                    type="date"
                    aria-label={date ? "Update start date" : "Set start date"}
                    defaultValue={date.slice(0, 10)}
                    disabled={disabled}
                    onChange={(e) => {
                        setDate(e.target.value ? `${e.target.value}T00:00:00Z` : "");
                        setHasSaved(false);
                        enqueueSnackbar({
                            message: "Date updated. Please press save to confirm.",
                            variant: "info",
                        });
                    }}
                    onClick={(e) => {
                        if ('showPicker' in HTMLInputElement.prototype) {
                            try {
                                e.currentTarget.showPicker();
                            } catch {
                                return;
                            }
                        }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>

            <Button
                onClick={handleConfirm}
                disabled={disabled}
                className={cn("h-10", borderClass)}
                icon={Save}
            />
        </div>
    );
}
