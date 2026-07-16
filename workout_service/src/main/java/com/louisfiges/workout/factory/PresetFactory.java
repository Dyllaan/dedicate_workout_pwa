package com.louisfiges.workout.factory;

import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.dto.request.CreateFromPresetRequest;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.periodisation.BlockType;
import com.louisfiges.workout.periodisation.PresetType;
import com.louisfiges.workout.dto.request.CreateBlockRequest;
import com.louisfiges.workout.dto.request.CreateProgrammeRequest;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class PresetFactory {

    public static CreateProgrammeRequest getPreset(CreateFromPresetRequest request) {
        if (request.presetType() == PresetType.POWERLIFT_MEET_PREP) {
            if (request.meetDate() == null || request.meetDate().isBlank()) {
                throw new BadRequestException("Meet date is required for the powerlifting meet-prep preset");
            }
            LocalDate meetDate;
            try {
                meetDate = Instant.parse(request.meetDate()).atZone(ZoneOffset.UTC).toLocalDate();
            } catch (Exception e) {
                try {
                    meetDate = LocalDate.parse(request.meetDate());
                } catch (Exception e2) {
                    throw new BadRequestException("Invalid meet date format. Use ISO-8601, e.g. '2026-07-01T00:00:00Z' or '2026-07-01'");
                }
            }
            return powerliftMeetPrep(request.splitId(), meetDate);
        }
        return getPreset(request.splitId(), request.presetType(), request.startDate());
    }

    public static CreateProgrammeRequest getPreset(
            UUID splitId,
            PresetType presetType,
            String startDate
    ) {
        Instant startInstant;
        try {
            startInstant = Instant.parse(startDate);
        } catch (Exception e) {
            throw new BadRequestException("Invalid start date format. Please use ISO-8601 format, e.g. '2024-07-01T00:00:00Z'");
        }

        return switch (presetType) {
            case HYPERTROPHY -> hypertrophyOnly(splitId, startInstant);
            case STRENGTH -> strengthOnly(splitId, startInstant);
            case HYPERTROPHY_STRENGTH -> hypertrophyStrength(splitId, startInstant);
            case FULL_CYCLE -> fullCycle(splitId, startInstant);
            case POWERLIFT_MEET_PREP -> throw new BadRequestException("POWERLIFT_MEET_PREP requires a meet date");
        };
    }

    private static CreateProgrammeRequest hypertrophyOnly(
            UUID splitId,
            Instant startDate
    ) {
        return new CreateProgrammeRequest(splitId, startDate.atZone(ZoneOffset.UTC).toLocalDate(), List.of(
                hypertrophyBlock(1, startDate)
        ));
    }

    private static CreateProgrammeRequest strengthOnly(
            UUID splitId,
            Instant startDate
    ) {
        return new CreateProgrammeRequest(splitId, startDate.atZone(ZoneOffset.UTC).toLocalDate(), List.of(
                strengthBlock(1, startDate)
        ));
    }

    private static CreateProgrammeRequest hypertrophyStrength(
            UUID splitId,
            Instant startDate
    ) {
        List<CreateBlockRequest> blocks = new ArrayList<>();
        blocks.add(hypertrophyBlock(1, startDate));
        blocks.add(strengthBlock(2, calculateStartDateForBlock(startDate, blocks, 2)));
        return new CreateProgrammeRequest(
                splitId,
                startDate.atZone(ZoneOffset.UTC).toLocalDate(),
                blocks
        );
    }

    private static CreateProgrammeRequest fullCycle(
            UUID splitId,
            Instant startDate
    ) {
        List<CreateBlockRequest> blocks = new ArrayList<>();
        blocks.add(hypertrophyBlock(1, startDate));
        blocks.add(strengthBlock(2, calculateStartDateForBlock(startDate, blocks, 2)));
        blocks.add(peakingBlock(3, calculateStartDateForBlock(startDate, blocks, 3)));
        return new CreateProgrammeRequest(
                splitId,
                startDate.atZone(ZoneOffset.UTC).toLocalDate(),
                blocks
        );
    }

    private static CreateProgrammeRequest powerliftMeetPrep(
            UUID splitId,
            LocalDate meetDate
    ) {
        LocalDate startDate = meetDate.minusWeeks(12);
        Instant startInstant = startDate.atStartOfDay(ZoneOffset.UTC).toInstant();
        List<CreateBlockRequest> blocks = new ArrayList<>();
        blocks.add(new CreateBlockRequest(
                "Powerbuilding Base",
                BlockType.HYPERTROPHY,
                ProgressionStrategy.REPS_FIRST,
                4,
                6.0,
                7.5,
                6,
                10,
                1,
                startInstant
        ));
        blocks.add(new CreateBlockRequest(
                "Specific Strength",
                BlockType.STRENGTH,
                ProgressionStrategy.WEIGHT_FIRST,
                4,
                7.0,
                8.5,
                3,
                6,
                2,
                calculateStartDateForBlock(startInstant, blocks, 2)
        ));
        blocks.add(new CreateBlockRequest(
                "Peaking And Taper",
                BlockType.PEAKING,
                ProgressionStrategy.WEIGHT_FIRST,
                4,
                7.5,
                9.0,
                1,
                3,
                3,
                calculateStartDateForBlock(startInstant, blocks, 3)
        ));

        return new CreateProgrammeRequest(
                splitId,
                startDate,
                blocks
        );
    }

    private static CreateBlockRequest hypertrophyBlock(int order, Instant startDate) {
        return new CreateBlockRequest(
                "Hypertrophy Block",
                BlockType.HYPERTROPHY,
                ProgressionStrategy.REPS_FIRST,
                5,
                6.0, 8.0,
                8, 12,
                order,
                startDate
        );
    }

    private static CreateBlockRequest strengthBlock(int order, Instant startDate) {
        return new CreateBlockRequest(
                "Strength Block",
                BlockType.STRENGTH,
                ProgressionStrategy.WEIGHT_FIRST,
                4,
                7.0, 9.0,
                3, 6,
                order,
                startDate
        );
    }

    private static CreateBlockRequest peakingBlock(int order, Instant startDate) {
        return new CreateBlockRequest(
                "Peaking Block",
                BlockType.PEAKING,
                ProgressionStrategy.WEIGHT_FIRST,
                3,
                8.0, 10.0,
                1, 3,
                order,
                startDate
        );
    }

    // helper method to get startDate plus the duration of the blocks that come before it in the preset
    public static Instant calculateStartDateForBlock(Instant baseStartDate, List<CreateBlockRequest> blocks, int blockOrder) {
        int weeksToAdd = blocks.stream().filter(block -> block.blockOrder() < blockOrder)
                .mapToInt(CreateBlockRequest::durationWeeks)
                .sum();
        return baseStartDate.plusSeconds(weeksToAdd * 7L * 24 * 60 * 60);
    }
}
