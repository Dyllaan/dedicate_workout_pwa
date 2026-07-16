package com.louisfiges.workout.dto.responses;

import org.springframework.data.domain.Page;

import java.util.List;

public record PagedResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious
) {
    public PagedResponse {
        items = items == null ? List.of() : List.copyOf(items);
    }

    public static <T> PagedResponse<T> from(Page<T> page) {
        return new PagedResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext(),
                page.hasPrevious()
        );
    }

    public static <T> PagedResponse<T> from(List<T> items, int page, int size, long totalItems) {
        int safeSize = Math.max(1, size);
        int totalPages = (int) Math.ceil(totalItems / (double) safeSize);
        boolean hasPrevious = page > 0;
        boolean hasNext = totalItems > 0 && (long) (page + 1) * safeSize < totalItems;
        return new PagedResponse<>(items, page, safeSize, totalItems, totalPages, hasNext, hasPrevious);
    }
}
