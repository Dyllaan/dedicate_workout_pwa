package com.louisfiges.workout.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

public final class PaginationUtils {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 25;
    private static final int MIN_SIZE = 1;

    private PaginationUtils() {}

    public static Pageable toPageable(Integer page, Integer size) {
        int safePage = Math.max(0, page != null ? page : DEFAULT_PAGE);
        int safeSize = Math.clamp(size != null ? size : DEFAULT_SIZE, MIN_SIZE, MAX_SIZE);
        return PageRequest.of(safePage, safeSize);
    }

    public static int safePage(Integer page) {
        return Math.max(0, page != null ? page : DEFAULT_PAGE);
    }

    public static int safeSize(Integer size) {
        return Math.clamp(size != null ? size : DEFAULT_SIZE, MIN_SIZE, MAX_SIZE);
    }
}
