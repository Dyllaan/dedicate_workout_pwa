package com.louisfiges.workout.service.periodisation;

import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.request.UpdateWeekRequest;
import com.louisfiges.workout.dto.responses.WeekDTO;
import com.louisfiges.workout.periodisation.PeriodisationValidationMessages;
import com.louisfiges.workout.repository.WeekRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@Transactional
public class WeekService {

    private final WeekRepository weekRepository;
    private final AnalysisCacheEvictor analysisCacheEvictor;

    public WeekService(WeekRepository weekRepository, AnalysisCacheEvictor analysisCacheEvictor) {
        this.weekRepository = weekRepository;
        this.analysisCacheEvictor = analysisCacheEvictor;
    }

    public WeekDTO getWeek(UUID weekId, UUID userId) {
        Week week = weekRepository.findByIdAndUserId(weekId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Week not found"));
        return week.toDTO();
    }

    @Transactional
    public WeekDTO update(UUID weekId, UpdateWeekRequest request, UUID userId) {
        Week week = weekRepository.findByIdAndUserId(weekId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Week not found"));
        assertProgrammeMutable(week);
        if (request.targetSetsPerExercise() != null) {
            week.setTargetSetsPerExercise(request.targetSetsPerExercise());
        }
        week.setRpeOverrideMin(request.rpeOverrideMin());
        week.setRpeOverrideMax(request.rpeOverrideMax());
        if (request.isDeload() != null) {
            week.setDeload(request.isDeload());
        }
        WeekDTO response = weekRepository.save(week).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    @Transactional
    public WeekDTO setDeload(UUID weekId, boolean deload, UUID userId) {
        Week week = weekRepository.findByIdAndUserId(weekId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Week not found"));
        assertProgrammeMutable(week);
        week.setDeload(deload);
        WeekDTO response = weekRepository.save(week).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    private void assertProgrammeMutable(Week week) {
        if (week.getBlock() != null
                && week.getBlock().getProgramme() != null
                && week.getBlock().getProgramme().isArchived()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    PeriodisationValidationMessages.ARCHIVED_PROGRAMME_IMMUTABLE
            );
        }
    }
}
