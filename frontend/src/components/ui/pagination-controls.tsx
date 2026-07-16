import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  totalItems?: number;
  className?: string;
  onPrevious: () => void;
  onNext: () => void;
};

export function PaginationControls({
  page,
  totalPages,
  hasPrevious,
  hasNext,
  totalItems,
  className,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  if (totalPages <= 1 && !hasPrevious && !hasNext) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3", className)}>
      <div className="text-sm text-muted-foreground">
        Page <span className="font-semibold text-foreground">{page + 1}</span>
        {totalPages > 0 ? (
          <>
            {" "}
            of <span className="font-semibold text-foreground">{totalPages}</span>
          </>
        ) : null}
        {typeof totalItems === "number" ? (
          <>
            {" "}
            <span className="hidden sm:inline">·</span>{" "}
            <span className="hidden sm:inline">{totalItems} total</span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          icon={ChevronLeft}
          type="button"
          size="sm"
          variant="outline"
          title="Previous page"
          disabled={!hasPrevious}
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button
          icon={ChevronRight}
          type="button"
          size="sm"
          variant="outline"
          title="Next page"
          disabled={!hasNext}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
