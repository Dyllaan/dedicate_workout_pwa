import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@radix-ui/react-select";
import { Activity, AlertTriangle, Calculator, Dumbbell, Info, TrendingUp } from "lucide-react";

type InolDrawerProps = {
  inol: number;
  backfilled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function InolDrawer({ inol, backfilled = false, open, onOpenChange }: InolDrawerProps) {
  const zones = [
    { range: "Under 0.4", label: "Recovery", color: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20", desc: "Very light session, minimal fatigue" },
    { range: "0.4 - 1.0", label: "Low", color: "bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20", desc: "Productive work without deep fatigue" },
    { range: "1.0 - 2.0", label: "Moderate", color: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20", desc: "Solid training stimulus, standard session" },
    { range: "2.0 - 3.0", label: "High", color: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20", desc: "Demanding workout, noticeable fatigue" },
    { range: "Over 3.0", label: "Very High", color: "bg-destructive/10 text-destructive border-destructive/20", desc: "Very taxing, extended recovery likely needed" },
  ]

  // Determine the dynamic message and dynamic text color matching your zone tokens
  const getInolStatus = (val: number) => {
    if (val < 0.4) return { textClass: "text-emerald-500 dark:text-emerald-400", message: "Nice recovery stimulus. Great for flushing out lingering soreness." };
    if (val <= 1.0) return { textClass: "text-sky-500 dark:text-sky-400", message: "Solid, productive workload. Drives progress without running you into the ground." };
    if (val <= 2.0) return { textClass: "text-amber-500 dark:text-amber-400", message: "Standard heavy training volume. Expect normal physical fatigue." };
    if (val <= 3.0) return { textClass: "text-orange-500 dark:text-orange-400", message: "Intense stimulus. Prioritize high-quality food and a good night's sleep tonight." };
    return { textClass: "text-destructive", message: "Critical target threshold reached. Extended systemic recovery is highly recommended." };
  };

  const currentStatus = getInolStatus(inol ?? 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>1RM Estimate</DrawerTitle>
            <DrawerDescription>Estimated one-rep max based on this set.</DrawerDescription>
          </DrawerHeader>
<DrawerContent className="max-h-[92vh]">
      <DrawerHeader className="border-b pb-4">
        <DrawerTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Activity className="h-5 w-5 text-primary" />
          Understanding INOL
        </DrawerTitle>
        <DrawerDescription>
          Intensity Number of Lifts • Measuring your training stress
        </DrawerDescription>
      </DrawerHeader>

      <ScrollArea className="overflow-y-auto px-6 py-6 h-full max-h-[calc(92vh-120px)]">
        <div className="mx-auto max-w-md space-y-8 pb-8">
          
          {/* Section 1: Introduction */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Dumbbell className="h-4 w-4" /> How INOL Works
            </h3>
            <p className="text-sm leading-relaxed text-foreground/90">
              <strong className="text-primary">INOL</strong> measures the exact stress each exercise places on your body. Instead of just looking at weight or reps in isolation, it dynamically blends intensity and volume into a single, actionable metric.
            </p>
          </section>

          {/* Section 2: Current INOL */}
            <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Your Current INOL
                </h3>
                <div className="flex items-center gap-3">
                    <Badge className="font-mono text-lg shadow-none bg-primary/10 text-primary border-primary/20">
                        {inol?.toFixed(2) ?? "-"}
                    </Badge>
                    <p className={`text-sm ${currentStatus.textClass}`}>
                        {currentStatus.message}
                    </p>
                </div>
            </section>

          {backfilled && (
            <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400 flex gap-2.5 items-start">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Estimated INOL</p>
                <p className="leading-relaxed text-muted-foreground">
                  This INOL was estimated from surrounding historical data and may be less accurate than real-time calculations. The reference 1RM was derived from a ±4 week window around this entry&apos;s date rather than a tracked block context.
                </p>
              </div>
            </section>
          )}

          {/* Section 3: Math Breakdown */}
          <section className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" /> The Calculation Steps
            </h4>
            
            <div className="space-y-4 text-xs">
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary">1</span>
                <div>
                  <p className="font-semibold text-foreground">Reference 1RM</p>
                  <p className="text-muted-foreground mt-0.5">Estimated max from your best set in the current block (median of Epley, Brzycki, and Lombardi). Carries forward from previous blocks if history is fresh.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary">2</span>
                <div>
                  <p className="font-semibold text-foreground">Intensity %</p>
                  <code className="my-1 block w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] border text-primary">
                    (weight / reference 1RM) x 100
                  </code>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary">3</span>
                <div>
                  <p className="font-semibold text-foreground">Set INOL</p>
                  <code className="my-1 block w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] border text-primary">
                    reps / (100 - intensity %)
                  </code>
                </div>
              </div>
            </div>

            <Separator />
            <p className="text-[11px] text-muted-foreground italic text-center">
              Exercise INOL = sum of all sets • Workout INOL = sum of all exercises
            </p>
          </section>

          {/* Section 4: Zones & Scoring */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> What Your Score Means
            </h3>
            
            <div className="divide-y rounded-xl border bg-card text-sm overflow-hidden">
              {zones.map((zone, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 gap-4 hover:bg-muted/20 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`font-mono text-xs shadow-none ${zone.color}`}>
                        {zone.range}
                      </Badge>
                      <span className="font-medium text-xs text-foreground/80">{zone.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{zone.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Context/Footer Note */}
          <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400 flex gap-2.5 items-start">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Coaching Context</p>
              <p className="leading-relaxed text-muted-foreground">
                A single workout at <span className="font-semibold text-foreground">2.0</span> is a tough session. Consistently hitting <span className="font-semibold text-foreground">3.0+</span> per workout or <span className="font-semibold text-foreground">6.0+</span> weekly usually signals under-recovery. Track your dashboard trend lines to stay ahead of fatigue.
              </p>
            </div>
          </section>

        </div>
      </ScrollArea>
    </DrawerContent>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button icon={undefined}>Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}