import useTips from "@/features/tips/hooks/useTips";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Loader2 } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";

export default function TipCarousel() {
    const { data: tips, isLoading, error } = useTips();

    if (isLoading) {
        return (
            <div className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs font-medium">Loading tips...</span>
            </div>
        );
    }

    if (error || !tips || tips.length === 0) return null;

    return (
        <div className="w-full md:px-12 py-2">
            <Carousel
                opts={{ align: "start", loop: true }}
                className="w-full"
                plugins={[
                    Autoplay({
                        delay: 15000,
                        stopOnInteraction: false,
                    }),
                ]}
            >
                <CarouselContent>
                    {tips.map((tip) => (
                        <CarouselItem key={tip.id}>
                            <div className="rounded-xl border-l-[3px] border-primary bg-primary/5 px-4 py-3.5">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                                    Tip
                                </p>
                                <p className="text-sm font-semibold leading-snug text-foreground">
                                    {tip.tip}
                                </p>
                                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                                    {tip.actionable_advice}
                                </p>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>

                {/*
                  On mobile: Flex container at the bottom right of the card.
                  On desktop: Restores shadcn's absolute side-docked behavior.
                */}
                <div className="mt-2 flex justify-center gap-2 md:block">
                    <CarouselPrevious className="static translate-y-0 md:absolute md:-left-12 md:top-1/2 md:-translate-y-1/2" />
                    <CarouselNext className="static translate-y-0 md:absolute md:-right-12 md:top-1/2 md:-translate-y-1/2" />
                </div>
            </Carousel>
        </div>
    );
}