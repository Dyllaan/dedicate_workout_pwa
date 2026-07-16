package com.louisfiges.gateway;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.info.BuildProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.ResponseEntity;
import reactor.core.publisher.Mono;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@SpringBootApplication
@EnableConfigurationProperties(UriConfiguration.class)
@RestController
public class ApiGatewayApplication {

    @Autowired
    private BuildProperties buildProperties;

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }

    /**
     * This method creates routes for the gateway
     * With Circuit Breaker pattern and Fallback URI for each route
     * @param builder RouteLocatorBuilder object to build routes
     * @param uriConfiguration uris for each microservice as specified in application.properties
     * @return
     */
    @Bean
    public RouteLocator myRoutes(RouteLocatorBuilder builder, UriConfiguration uriConfiguration) {
        return builder.routes()
                .route(p -> p
                        .path("/workout/**")
                        .filters(f -> f
                                .dedupeResponseHeader("Access-Control-Allow-Origin Access-Control-Allow-Credentials", "RETAIN_FIRST")
                                .rewritePath("/workout(?<segment>/?.*)", "${segment}")
                                .circuitBreaker(config -> config
                                        .setName("workout-CB")
                                        .setFallbackUri("forward:/workout-fallback")))

                        .uri(uriConfiguration.getWorkoutService()))

                .route(p -> p
                        .path("/auth/**")
                        .filters(f -> f
                                .dedupeResponseHeader("Access-Control-Allow-Origin Access-Control-Allow-Credentials", "RETAIN_FIRST")
                                .rewritePath("/auth(?<segment>/?.*)", "${segment}")
                                .circuitBreaker(config -> config
                                        .setName("auth-CB")
                                        .setFallbackUri("forward:/fallback")))
                        .uri(uriConfiguration.getAuthService()))
                .build();
    }

    @RequestMapping("/version")
    public Mono<ResponseEntity<Map<String, String>>> version() {
        return Mono.just(ResponseEntity.ok(Map.of("version", buildProperties.getVersion())));
    }
}

@Configuration
@ConfigurationProperties(prefix = "uri")
class UriConfiguration {

    private String workoutService;
    private String authService;

    public String getWorkoutService() {
        return workoutService;
    }

    public void setWorkoutService(String workoutService) {
        this.workoutService = workoutService;
    }

    String getAuthService() {
        return authService;
    }

    public void setAuthService(String authService) {
        this.authService = authService;
    }

}
