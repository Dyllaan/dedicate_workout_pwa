package com.louisfiges.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@org.springframework.stereotype.Service
public class BrowserLogService {

    private static final Logger logger = LoggerFactory.getLogger(BrowserLogService.class);

    private static final Set<String> ALLOWED_LEVELS = Set.of("warn", "error");
    private static final int MAX_MESSAGE_LENGTH = 500;
    private static final int MAX_STACK_LENGTH = 4_000;
    private static final int MAX_URL_LENGTH = 2_048;
    private static final int MAX_USER_AGENT_LENGTH = 512;

    void record(List<BrowserLogEventRequest> events, String requestId) {
        String resolvedRequestId = requestId == null || requestId.isBlank() ? "unknown" : requestId;

        for (BrowserLogEventRequest event : events) {
            validateEvent(event);

            String level = normalizeRequired(event.level(), "level");
            String message = normalizeRequired(event.message(), "message", MAX_MESSAGE_LENGTH);
            String url = normalizeOptional(event.url(), MAX_URL_LENGTH);
            String referrer = normalizeOptional(event.referrer(), MAX_URL_LENGTH);
            String userAgent = normalizeOptional(event.userAgent(), MAX_USER_AGENT_LENGTH);
            String stack = normalizeOptional(event.stack(), MAX_STACK_LENGTH);

            LoggingEventBuilder builder = "error".equals(level) ? logger.atError() : logger.atWarn();
            builder.addKeyValue("event_type", "browser_log")
                    .addKeyValue("request_id", resolvedRequestId)
                    .addKeyValue("browser_level", level);

            if (url != null) {
                builder.addKeyValue("browser_url", url);
            }
            if (referrer != null) {
                builder.addKeyValue("browser_referrer", referrer);
            }
            if (userAgent != null) {
                builder.addKeyValue("browser_user_agent", userAgent);
            }
            if (event.line() != null) {
                builder.addKeyValue("browser_line", event.line());
            }
            if (event.column() != null) {
                builder.addKeyValue("browser_column", event.column());
            }
            if (stack != null) {
                builder.addKeyValue("browser_stack", stack);
            }

            builder.log(message);
        }
    }

    private void validateEvent(BrowserLogEventRequest event) {
        if (event == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Browser log event cannot be null");
        }

        if (event.level() == null || !ALLOWED_LEVELS.contains(event.level().trim().toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Browser log level must be warn or error");
        }

        if (event.message() == null || event.message().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Browser log message cannot be blank");
        }
    }

    private String normalizeRequired(String value, String field) {
        return normalizeRequired(value, field, Integer.MAX_VALUE);
    }

    private String normalizeRequired(String value, String field, int maxLength) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Browser log " + field + " cannot be blank");
        }

        String normalized = normalizeOptional(value, maxLength);
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Browser log " + field + " cannot be blank");
        }

        return normalized;
    }

    private String normalizeOptional(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String normalized = value.replaceAll("\\s+", " ").trim();
        if (normalized.length() > maxLength) {
            return normalized.substring(0, maxLength);
        }

        return normalized;
    }
}
