import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  rows?: number;
  className?: string;
  "data-testid"?: string;
}

export default function LoadingState({
  rows = 3,
  className,
  "data-testid": dataTestId,
}: LoadingStateProps) {
  return (
    <div
      data-testid={dataTestId}
      aria-live="polite"
      className={cn("space-y-3 pt-2", className)}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="ui-feedback-panel"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
