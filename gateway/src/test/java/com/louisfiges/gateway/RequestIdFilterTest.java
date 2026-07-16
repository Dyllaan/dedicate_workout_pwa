package com.louisfiges.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class RequestIdFilterTest {

    @Test
    void generatesARequestIdWhenNoneIsProvided() {
        RequestIdFilter filter = new RequestIdFilter();
        RecordingChain chain = new RecordingChain();

        filter.filter(exchange("/browser-logs"), chain).block();

        assertNotNull(chain.requestId.get());
        assertEquals(chain.requestId.get(), chain.exchange.getResponse().getHeaders().getFirst("X-Request-Id"));
    }

    @Test
    void preservesAnExistingRequestId() {
        RequestIdFilter filter = new RequestIdFilter();
        RecordingChain chain = new RecordingChain();

        filter.filter(exchange("/browser-logs").mutate()
                .request(builder -> builder.header("X-Request-Id", "request-abc"))
                .build(), chain).block();

        assertEquals("request-abc", chain.requestId.get());
        assertEquals("request-abc", chain.exchange.getResponse().getHeaders().getFirst("X-Request-Id"));
    }

    private static MockServerWebExchange exchange(String path) {
        return MockServerWebExchange.from(MockServerHttpRequest.post(path).build());
    }

    private static final class RecordingChain implements WebFilterChain {
        private final AtomicReference<String> requestId = new AtomicReference<>();
        private ServerWebExchange exchange;

        @Override
        public Mono<Void> filter(ServerWebExchange exchange) {
            this.exchange = exchange;
            requestId.set(exchange.getRequest().getHeaders().getFirst("X-Request-Id"));
            return Mono.empty();
        }
    }
}
