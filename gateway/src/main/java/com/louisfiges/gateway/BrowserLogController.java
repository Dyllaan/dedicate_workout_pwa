package com.louisfiges.gateway;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
public class BrowserLogController {

    private static final int MAX_EVENTS = 20;

    private final BrowserLogService browserLogService;

    public BrowserLogController(BrowserLogService browserLogService) {
        this.browserLogService = browserLogService;
    }

    @PostMapping("/browser-logs")
    public Mono<BrowserLogAcceptedResponse> submit(
            @RequestBody BrowserLogBatchRequest request,
            @RequestHeader(value = RequestIdFilter.REQUEST_ID_HEADER, required = false) String requestId
    ) {
        if (request == null || request.events() == null || request.events().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Browser log batch cannot be empty");
        }

        if (request.events().size() > MAX_EVENTS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Browser log batch is too large");
        }

        browserLogService.record(request.events(), requestId);
        return Mono.just(new BrowserLogAcceptedResponse(request.events().size()));
    }
}

record BrowserLogBatchRequest(List<BrowserLogEventRequest> events) {
}

record BrowserLogEventRequest(
        String level,
        String message,
        String url,
        String referrer,
        String userAgent,
        String stack,
        Integer line,
        Integer column
) {
}

record BrowserLogAcceptedResponse(int accepted) {
}
