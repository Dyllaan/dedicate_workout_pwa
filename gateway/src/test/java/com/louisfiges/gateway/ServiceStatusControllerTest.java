package com.louisfiges.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.Properties;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ServiceStatusControllerTest {

    @Test
    void returnsCombinedHealthAndVersionStatusForAllServices() {
        ServiceStatusController controller = new ServiceStatusController(
                uriConfiguration(),
                buildProperties(),
                webClientBuilder(Map.of(
                        "/actuator/health", "{\"status\":\"UP\"}",
                        "/version", "{\"name\":\"Downstream\",\"version\":\"2.4.1\",\"time\":\"2026-05-21T10:00:00Z\"}"
                ))
        );

        ServiceStatusResponse response = controller.status().block().getBody();

        assertNotNull(response);
        Map<String, ServiceStatusItem> byId = response.services().stream()
                .collect(Collectors.toMap(ServiceStatusItem::id, item -> item));
        assertEquals("UP", byId.get("gateway").health());
        assertEquals("2.0.0", byId.get("gateway").version());
        assertEquals("UP", byId.get("auth").health());
        assertEquals("2.4.1", byId.get("auth").version());
        assertEquals("UP", byId.get("workout").health());
        assertEquals("2.4.1", byId.get("workout").version());
        assertEquals("UP", byId.get("frontend").health());
    }

    @Test
    void marksOnlyTheFailedDownstreamServiceDown() {
        ServiceStatusController controller = new ServiceStatusController(
                uriConfiguration(),
                buildProperties(),
                webClientBuilder(Map.of(
                        "http://auth-service:8010/actuator/health", "{\"status\":\"UP\"}",
                        "http://auth-service:8010/version", "{\"version\":\"1.2.3\"}"
                ))
        );

        ServiceStatusResponse response = controller.status().block().getBody();

        assertNotNull(response);
        Map<String, ServiceStatusItem> byId = response.services().stream()
                .collect(Collectors.toMap(ServiceStatusItem::id, item -> item));
        assertEquals("UP", byId.get("auth").health());
        assertEquals("DOWN", byId.get("workout").health());
        assertEquals(null, byId.get("workout").version());
    }

    private UriConfiguration uriConfiguration() {
        UriConfiguration configuration = new UriConfiguration();
        configuration.setAuthService("http://auth-service:8010/");
        configuration.setWorkoutService("http://workout-service:8081/");
        return configuration;
    }

    private BuildProperties buildProperties() {
        Properties properties = new Properties();
        properties.setProperty("version", "2.0.0");
        properties.setProperty("name", "Dedicate Gateway");
        return new BuildProperties(properties);
    }

    private WebClient.Builder webClientBuilder(Map<String, String> responses) {
        ExchangeFunction exchange = request -> {
            String full = request.url().toString();
            String path = request.url().getPath();
            String body = responses.getOrDefault(full, responses.get(path));
            if (body == null) {
                return Mono.just(ClientResponse.create(HttpStatus.SERVICE_UNAVAILABLE).build());
            }
            return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .body(body)
                    .build());
        };
        return WebClient.builder().exchangeFunction(exchange);
    }
}
