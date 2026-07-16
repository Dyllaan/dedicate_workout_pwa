package com.louisfiges.gateway;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
public class FallbackController {

    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @RequestMapping("/workout-fallback")
    public ResponseEntity<FallbackResponse> workoutFallback() {
        FallbackResponse response = new FallbackResponse(
                "Workout service is currently unavailable. Please try again later.",
                LocalDateTime.now().format(formatter)
        );
        return ResponseEntity.status(503).body(response);
    }

    @RequestMapping("/fallback")
    public ResponseEntity<FallbackResponse> authFallback() {
        return ResponseEntity.status(503).body(
            new FallbackResponse("Auth service unavailable.", LocalDateTime.now().format(formatter))
        );
    }
}
