package com.louisfiges.workout.controller.periodisation;

import com.louisfiges.workout.dto.request.UpdateDateRequest;
import com.louisfiges.workout.dto.request.UpdateStartDateRequest;
import com.louisfiges.workout.dto.responses.BlockDTO;
import com.louisfiges.workout.service.periodisation.BlockService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.oauth2.jwt.Jwt;


import java.util.UUID;

@RestController
@RequestMapping("/blocks")
public class BlockController {

    private final BlockService blockService;

    public BlockController(BlockService blockService) {
        this.blockService = blockService;
    }

    @GetMapping("/{blockId}")
    public ResponseEntity<BlockDTO> getBlock(
            @PathVariable UUID blockId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(blockService.getById(blockId, userId));
    }

    @PatchMapping("/{blockId}")
    public ResponseEntity<BlockDTO> updateBlock(
            @PathVariable UUID blockId,
            @RequestBody UpdateDateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(blockService.update(blockId, request, userId));
    }

    @PatchMapping("/{blockId}/start-date")
    public ResponseEntity<BlockDTO> updateStartDate(
            @PathVariable UUID blockId,
            @RequestBody UpdateStartDateRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(blockService.setStartDate(blockId, req.startDate(), userId));
    }

    @DeleteMapping("/{blockId}")
    public ResponseEntity<Void> deleteBlock(
            @PathVariable UUID blockId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        blockService.delete(blockId, userId);
        return ResponseEntity.noContent().build();
    }

}