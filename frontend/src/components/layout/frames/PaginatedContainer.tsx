import {
    PaginationItem,
    Pagination,
    PaginationLink,
    PaginationContent,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis
} from "../../ui/pagination";
import { useMemo } from "react";
import {cn} from "@/lib/utils.ts";
import Panel from "@/components/layout/frames/Panel";

interface Props {
    currentPage: number; // Expecting 1-indexed page (1, 2, 3...)
    total?: number;
    children?: React.ReactNode;
    onPageChange: (currentPage: number) => void;
    className?: string;
}

export default function PaginatedContainer({ currentPage, total, onPageChange, children, className }: Props) {
    // Safely normalize currentPage so it's never less than 1 in the UI logic
    const safeCurrentPage = Math.max(1, currentPage);

    const pageNumbers = useMemo(() => {
        if (total === undefined) {
            return [safeCurrentPage];
        }

        if (total <= 1) {
            return [1];
        }

        const pages: (number | "ellipsis")[] = [];
        const maxVisible = 5;

        if (total <= maxVisible) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            pages.push(1);

            let start = Math.max(2, safeCurrentPage - 1);
            let end = Math.min(total - 1, safeCurrentPage + 1);

            if (safeCurrentPage <= 2) {
                end = 4;
            } else if (safeCurrentPage >= total - 1) {
                start = total - 3;
            }

            if (start > 2) pages.push("ellipsis");

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < total - 1) pages.push("ellipsis");

            pages.push(total);
        }

        return pages;
    }, [safeCurrentPage, total]);

    return (
        <Panel>
            <div className={cn("flex-1", className)}>
                {children}
            </div>
            <Pagination className="fixed bottom-21 left-0 right-0 mx-auto max-w-screen-sm z-40">
                <PaginationContent>
                    {/* Previous Button */}
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => {
                                if (safeCurrentPage > 1) onPageChange(safeCurrentPage - 1);
                            }}
                            className={safeCurrentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>

                    {/* Page Numbers */}
                    {pageNumbers.map((page, index) => {
                        if (page === "ellipsis") {
                            return (
                                <PaginationItem key={`ellipsis-${index}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            );
                        }

                        return (
                            /* FIX: Wrapped PaginationLink in PaginationItem */
                            <PaginationItem key={page}>
                                <PaginationLink
                                    href={`?page=${page}`}
                                    isActive={safeCurrentPage === page}
                                    aria-current={safeCurrentPage === page ? "page" : undefined}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (safeCurrentPage !== page) {
                                            onPageChange(page);
                                        }
                                    }}
                                    className={safeCurrentPage === page ? "pointer-events-none select-none border-green-900" : "cursor-pointer"}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        );
                    })}

                    {/* Next Button */}
                    <PaginationItem>
                        <PaginationNext
                            onClick={() => {
                                if (total === undefined || safeCurrentPage < total) {
                                    onPageChange(safeCurrentPage + 1);
                                }
                            }}
                            className={(total !== undefined && (total <= 1 || safeCurrentPage >= total))
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </Panel>
    );
}