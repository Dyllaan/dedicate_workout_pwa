import React from "react";
import { cn } from "@/lib/utils.ts";

// Mobile-first mapping: Defaults to 1 or 2 cols on mobile, scales on medium screens
const MD_COLS_MAP: Record<number, string> = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
};

export default function StatGrid({
                                     children,
                                     className,
                                     cols = 3,
                                 }: {
    children: React.ReactNode;
    className?: string;
    cols?: number;
}) {
    const mdColsClass = MD_COLS_MAP[cols] ?? MD_COLS_MAP[3];

    return (
        <div
            className={cn(
                "grid grid-cols-2 gap-4 sm:gap-5 w-full", // Mobile default: 2 columns, spacious gaps
                mdColsClass,                             // Desktop override
                className
            )}
        >
            {children}
        </div>
    );
}