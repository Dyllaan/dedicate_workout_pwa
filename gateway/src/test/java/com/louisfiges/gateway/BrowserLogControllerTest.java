package com.louisfiges.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import reactor.core.publisher.Mono;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BrowserLogControllerTest {

    @Test
    void acceptsAValidBrowserLogBatch() {
        BrowserLogController controller = new BrowserLogController(new BrowserLogService());

        BrowserLogAcceptedResponse response = controller.submit(new BrowserLogBatchRequest(List.of(
                new BrowserLogEventRequest(
                        "warn",
                        "Something happened",
                        "https://app.example.com/workouts",
                        "https://app.example.com/",
                        "Mozilla/5.0",
                        "stack trace",
                        12,
                        34
                )
        )), "request-123").block();

        assertEquals(1, response.accepted());
    }

    @Test
    void rejectsBrowserLogBatchesThatAreTooLarge() {
        BrowserLogController controller = new BrowserLogController(new BrowserLogService());

        BrowserLogBatchRequest request = new BrowserLogBatchRequest(
                java.util.stream.IntStream.range(0, 21)
                        .mapToObj(index -> new BrowserLogEventRequest(
                                "error",
                                "event-" + index,
                                "https://app.example.com/",
                                "https://app.example.com/",
                                "Mozilla/5.0",
                                null,
                                null,
                                null
                        ))
                        .toList()
        );

        ResponseStatusExceptionAssert.assertBadRequest(() -> controller.submit(request, "request-123"));
    }

    private static final class ResponseStatusExceptionAssert {
        private static void assertBadRequest(java.util.concurrent.Callable<Mono<BrowserLogAcceptedResponse>> action) {
            var thrown = assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> action.call().block());
            assertEquals(HttpStatus.BAD_REQUEST, thrown.getStatusCode());
        }
    }
}
