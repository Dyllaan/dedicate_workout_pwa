package com.louisfiges.gateway;

import org.springframework.boot.info.BuildProperties;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
public class ServiceStatusController {

    private static final Duration STATUS_TIMEOUT = Duration.ofSeconds(2);

    private final UriConfiguration uriConfiguration;
    private final BuildProperties buildProperties;
    private final WebClient webClient;

    public ServiceStatusController(
            UriConfiguration uriConfiguration,
            BuildProperties buildProperties,
            WebClient.Builder webClientBuilder
    ) {
        this.uriConfiguration = uriConfiguration;
        this.buildProperties = buildProperties;
        this.webClient = webClientBuilder.build();
    }

    @GetMapping("/service-status")
    public Mono<ResponseEntity<ServiceStatusResponse>> status() {
        Mono<ServiceStatusItem> auth = downstreamService(
                "auth",
                "Auth Service",
                uriConfiguration.getAuthService()
        );
        Mono<ServiceStatusItem> workout = downstreamService(
                "workout",
                "Workout Service",
                uriConfiguration.getWorkoutService()
        );

        return Mono.zip(auth, workout)
                .map(tuple -> ResponseEntity.ok(new ServiceStatusResponse(List.of(
                        gatewayStatus(),
                        tuple.getT1(),
                        tuple.getT2(),
                        new ServiceStatusItem("frontend", "Frontend", "UP", null, "App", null)
                ))));
    }

    private ServiceStatusItem gatewayStatus() {
        return new ServiceStatusItem(
                "gateway",
                "Gateway",
                "UP",
                normalizeVersion(buildProperties.getVersion()),
                buildProperties.getName(),
                buildProperties.getTime() == null ? null : buildProperties.getTime().toString()
        );
    }

    private Mono<ServiceStatusItem> downstreamService(String id, String label, String baseUri) {
        Mono<String> health = getJson(resolve(baseUri, "actuator/health"))
                .map(payload -> "UP".equals(String.valueOf(payload.get("status"))) ? "UP" : "DOWN")
                .defaultIfEmpty("DOWN")
                .onErrorReturn("DOWN");

        Mono<Map<String, Object>> version = getJson(resolve(baseUri, "version"))
                .defaultIfEmpty(Map.of())
                .onErrorReturn(Map.of());

        return Mono.zip(health, version)
                .map(tuple -> {
                    String healthStatus = tuple.getT1();
                    Map<String, Object> versionPayload = tuple.getT2();
                    boolean up = "UP".equals(healthStatus);
                    return new ServiceStatusItem(
                            id,
                            label,
                            healthStatus,
                            up ? normalizeVersion(asString(versionPayload.get("version"))) : null,
                            up ? asString(versionPayload.get("name")) : null,
                            up ? asString(versionPayload.get("time")) : null
                    );
                });
    }

    private Mono<Map<String, Object>> getJson(URI uri) {
        return webClient.get()
                .uri(uri)
                .exchangeToMono(response -> response.statusCode().is2xxSuccessful()
                        ? response.bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                        : Mono.empty())
                .timeout(STATUS_TIMEOUT);
    }

    private URI resolve(String baseUri, String path) {
        return URI.create(baseUri).resolve(path);
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private String normalizeVersion(String version) {
        if (version == null || version.equals("unknown")) {
            return null;
        }
        int suffixIndex = version.indexOf('-');
        return suffixIndex < 0 ? version : version.substring(0, suffixIndex);
    }
}

record ServiceStatusResponse(List<ServiceStatusItem> services) {
}

record ServiceStatusItem(
        String id,
        String label,
        String health,
        String version,
        String name,
        String buildTime
) {
}
