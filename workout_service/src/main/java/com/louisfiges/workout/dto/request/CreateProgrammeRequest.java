package com.louisfiges.workout.dto.request;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateProgrammeRequest(
        UUID splitId,
        LocalDate startDate,
        List<CreateBlockRequest> blocks
) {
}
