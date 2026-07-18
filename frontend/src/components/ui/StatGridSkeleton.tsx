import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatTileSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card p-4", className)}
    >
      <Skeleton className="h-3 w-16 mb-3" />
      <Skeleton className="h-5 w-20" />
    </div>
  );
}
