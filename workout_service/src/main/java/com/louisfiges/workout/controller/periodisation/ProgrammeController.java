package com.louisfiges.workout.controller.periodisation;

import com.louisfiges.workout.dto.request.*;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.ProgrammeDTO;
import com.louisfiges.workout.periodisation.PresetType;
import com.louisfiges.workout.periodisation.ProgrammePresetType;
import com.louisfiges.workout.service.periodisation.ProgrammeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import com.louisfiges.workout.factory.PresetFactory;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/programmes")
public class ProgrammeController {

    private final ProgrammeService programmeService;

    public ProgrammeController(ProgrammeService programmeService) {
        this.programmeService = programmeService;
    }

    @PostMapping
    public ResponseEntity<ProgrammeDTO> createProgramme(
            @RequestBody CreateProgrammeRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(programmeService.createProgramme(request, userId, ProgrammePresetType.CUSTOM));
    }

    @PostMapping("/preset")
    public ResponseEntity<ProgrammeDTO> createFromPreset(
            @RequestBody CreateFromPresetRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        CreateProgrammeRequest preset = PresetFactory.getPreset(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(programmeService.createProgramme(preset, userId, ProgrammePresetType.fromPreset(req.presetType())));
    }

    @PatchMapping("/{programmeId}/start-date")
    public ResponseEntity<ProgrammeDTO> setProgrammeStartDate(
            @PathVariable UUID programmeId,
            @RequestBody UpdateStartDateRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(programmeService.setProgrammeStartDate(programmeId, Instant.parse(req.startDate()), userId));
    }

    @PatchMapping("/{programmeId}/active")
    public ResponseEntity<ProgrammeDTO> setProgrammeActive(
            @PathVariable UUID programmeId,
            @RequestBody ProgrammeActiveToggleRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(programmeService.setProgrammeActive(programmeId, req.active(), userId));
    }
    
    @GetMapping("/presets")
    public ResponseEntity<List<String>> getProgrammes() {
        List<String> presets = Arrays.stream(PresetType.values())
                .map(Enum::name)
                .collect(Collectors.toList());
        return ResponseEntity.ok(presets);
    }

    @PutMapping("/{programmeId}/block")
    public ResponseEntity<ProgrammeDTO> addBlockToProgramme(
            @PathVariable UUID programmeId,
            @RequestBody CreateBlockRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(programmeService.addBlockToProgramme(programmeId, request, userId));
    }


    @GetMapping("/split/{splitId}")
    public PagedResponse<ProgrammeDTO> getAllForSplit(
            @PathVariable UUID splitId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return programmeService.getAllByUserForSplit(userId, splitId, page, size);
    }

    @DeleteMapping("/{programmeId}")
    public ResponseEntity<Void> deleteProgramme(
            @PathVariable UUID programmeId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        programmeService.deleteProgramme(programmeId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{programmeId}/archive")
    public ResponseEntity<Void> archiveProgramme(
            @PathVariable UUID programmeId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        programmeService.archiveProgramme(programmeId, userId);
        return ResponseEntity.ok().build();
    }

    

}
