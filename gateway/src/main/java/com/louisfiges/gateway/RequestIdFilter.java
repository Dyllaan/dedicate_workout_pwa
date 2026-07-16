package com.louisfiges.gateway;

import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class RequestIdFilter implements WebFilter, Ordered {

    static final String REQUEST_ID_HEADER = "X-Request-Id";
    static final String REQUEST_ID_ATTRIBUTE = RequestIdFilter.class.getName() + ".requestId";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String requestId = exchange.getRequest().getHeaders().getFirst(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        final String resolvedRequestId = requestId;

        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(headers -> headers.set(REQUEST_ID_HEADER, resolvedRequestId))
                .build();

        ServerWebExchange mutated = exchange.mutate().request(request).build();
        mutated.getAttributes().put(REQUEST_ID_ATTRIBUTE, resolvedRequestId);
        mutated.getResponse().getHeaders().set(REQUEST_ID_HEADER, resolvedRequestId);

        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        return -300;
    }
}
