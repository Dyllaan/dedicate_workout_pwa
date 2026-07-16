import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Layers, TrendingUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboardSummary";

const STORAGE_KEY = "dedicate_onboarded";

const slides = [
    {
        icon: Dumbbell,
        iconColor: "text-primary",
        iconBg: "bg-primary/10",
        title: "Welcome to Dedicate",
        body: "Let's get you set up in a few steps so you can start making progress.",
    },
    {
        icon: Plus,
        iconColor: "text-blue-500",
        iconBg: "bg-blue-500/10",
        title: "Build workout templates",
        body: "Create workouts with exercises, sets, and rep targets.",
    },
    {
        icon: Layers,
        iconColor: "text-violet-500",
        iconBg: "bg-violet-500/10",
        title: "Organise into splits",
        body: "Group workouts into a training split (Push/Pull/Legs, Upper/Lower, etc.). Add training blocks to periodise your programme.",
    },
    {
        icon: TrendingUp,
        iconColor: "text-green-500",
        iconBg: "bg-green-500/10",
        title: "Track your progress",
        body: "Log each session and track your progress.",
    },
];

interface OnboardingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
    const { signedIn } = useAuth();
    const { data: dashboardSummary, isLoading: summaryLoading } = useDashboardSummary();
    const navigate = useNavigate();
    const [current, setCurrent] = useState(0);
    const splitCount = dashboardSummary?.splitCount ?? 0;

    useEffect(() => {
        if (signedIn && !summaryLoading && splitCount === 0 && !localStorage.getItem(STORAGE_KEY)) {
            setCurrent(0);
            onOpenChange(true);
        }
    }, [signedIn, summaryLoading, splitCount, onOpenChange]);


    useEffect(() => {
        if (open) setCurrent(0);
    }, [open]);

    function dismiss() {
        localStorage.setItem(STORAGE_KEY, "1");
        onOpenChange(false);
    }

    function next() {
        setCurrent(c => Math.min(c + 1, slides.length - 1));
    }

    function prev() {
        setCurrent(c => Math.max(c - 1, 0));
    }

    function finish() {
        dismiss();
        navigate("/workout/create");
    }

    const slide = slides[current];
    const Icon = slide.icon;
    const isLast = current === slides.length - 1;

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
            <DialogContent
                className="max-w-sm w-full p-0 overflow-hidden gap-0 [&>button]:hidden"
                aria-describedby="onboarding-description"
            >
                <div className={cn("flex flex-col items-center pt-10 pb-8 px-6 gap-4", slide.iconBg)}>
                    <div className={cn("rounded-2xl p-4", slide.iconBg)}>
                        <Icon className={cn("h-10 w-10", slide.iconColor)} strokeWidth={1.5} />
                    </div>
                    <DialogTitle className="text-xl font-bold text-center text-foreground">
                        {slide.title}
                    </DialogTitle>
                </div>

                <div className="px-6 pt-5 pb-2">
                    <DialogDescription id="onboarding-description" className="text-sm text-muted-foreground text-center leading-relaxed">
                        {slide.body}
                    </DialogDescription>
                </div>

                <div className="flex gap-1.5 justify-center py-4">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-colors",
                                i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                            )}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between gap-3 px-6 pb-6">
                    {current > 0 ? (
                        <Button icon={undefined} size="sm" onClick={prev}>Back</Button>
                    ) : (
                        <Button icon={undefined} size="sm" onClick={dismiss}>Skip</Button>
                    )}
                    {isLast ? (
                        <Button icon={undefined} size="sm" onClick={finish}>Create first workout</Button>
                    ) : (
                        <Button icon={undefined} size="sm" onClick={next}>Next</Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
