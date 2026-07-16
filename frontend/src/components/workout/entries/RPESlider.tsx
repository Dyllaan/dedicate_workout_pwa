import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RPESliderProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const getRPEColor = (rpe: number) => {
    if (rpe <= 3) return 'bg-green-800';
    if (rpe <= 5) return 'bg-green-800';
    if (rpe <= 7) return 'bg-yellow-800';
    if (rpe <= 8) return 'bg-orange-800';
    return 'bg-red-500';
};

const getRPELabel = (rpe: number) => {
    if (rpe <= 3) return 'Easy';
    if (rpe <= 5) return 'Moderate';
    if (rpe <= 7) return 'Challenging';
    if (rpe <= 8) return 'Hard';
    if (rpe <= 9) return 'Very Hard';
    return 'Max Effort';
};
export default function RPESlider({ value, onChange, className }: RPESliderProps) {
    const rpeValue = parseFloat(value);

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Badge 
                        variant="secondary" 
                        className={cn(
                            "text-xs font-semibold",
                            getRPEColor(rpeValue)
                        )}
                    >
                        {value}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {getRPELabel(rpeValue)}
                    </span>
                </div>
            </div>
            <Slider
                value={[rpeValue]}
                onValueChange={(val) => onChange(val[0].toString())}
                min={1}
                max={10}
                step={0.5}
                className="py-2"
            />
        </div>
    );
}
