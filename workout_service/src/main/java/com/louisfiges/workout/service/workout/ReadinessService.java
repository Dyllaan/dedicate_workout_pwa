package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dao.workout.ReadinessCheckIn;
import com.louisfiges.workout.dto.request.insights.ReadinessCheckInRequestDTO;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.insights.ReadinessCheckInDTO;
import com.louisfiges.workout.dto.responses.insights.ReadinessHistoryPointDTO;
import com.louisfiges.workout.dto.responses.insights.ReadinessHistoryResponseDTO;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.repository.ReadinessCheckInRepository;
import com.louisfiges.workout.service.mapper.ReadinessCheckInMapper;
import com.louisfiges.workout.util.PaginationUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ReadinessService {

    private final ReadinessCheckInRepository readinessCheckInRepository;
    private final ReadinessCheckInMapper readinessCheckInMapper;

    public ReadinessService(ReadinessCheckInRepository readinessCheckInRepository, ReadinessCheckInMapper readinessCheckInMapper) {
        this.readinessCheckInRepository = readinessCheckInRepository;
        this.readinessCheckInMapper = readinessCheckInMapper;
    }

    @Transactional
    public ReadinessCheckInDTO createCheckIn(UUID userId, ReadinessCheckInRequestDTO request) {
        return createCheckIn(userId, null, request);
    }

    @Transactional
    public ReadinessCheckInDTO createCheckIn(UUID userId, UUID workoutEntryId, ReadinessCheckInRequestDTO request) {
        validate(request.sleepQuality(), "sleepQuality");
        validate(request.stressLevel(), "stressLevel");
        validate(request.sorenessLevel(), "sorenessLevel");
        validate(request.confidenceLevel(), "confidenceLevel");

        ReadinessCheckIn saved = readinessCheckInRepository.save(new ReadinessCheckIn(
                userId,
                workoutEntryId,
                request.sleepQuality(),
                request.stressLevel(),
                request.sorenessLevel(),
                request.confidenceLevel()
        ));
        return readinessCheckInMapper.toDTO(saved);
    }

    public ReadinessHistoryResponseDTO getHistory(UUID userId, int days) {
        int resolvedDays = Math.min(Math.max(days, 1), 30);
        Instant cutoff = Instant.now().minus(resolvedDays, ChronoUnit.DAYS);
        List<ReadinessCheckInRepository.ReadinessHistoryRow> rows = readinessCheckInRepository
                .findHistoryByUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(userId, cutoff);

        List<ReadinessHistoryPointDTO> points = new java.util.ArrayList<>(rows.size());
        int readinessScoreTotal = 0;
        for (ReadinessCheckInRepository.ReadinessHistoryRow row : rows) {
            short readinessScore = calculateScore(
                    row.getSleepQuality(),
                    row.getStressLevel(),
                    row.getSorenessLevel(),
                    row.getConfidenceLevel()
            );
            readinessScoreTotal += readinessScore;
            points.add(new ReadinessHistoryPointDTO(
                    row.getCreatedAt(),
                    readinessScore,
                    row.getSleepQuality(),
                    row.getStressLevel(),
                    row.getSorenessLevel(),
                    row.getConfidenceLevel()
            ));
        }

        double average = points.isEmpty() ? 0.0 : (double) readinessScoreTotal / points.size();

        return new ReadinessHistoryResponseDTO(
                resolvedDays,
                round(average),
                PagedResponse.from(points, 0, Math.max(1, points.size()), points.size())
        );
    }

    public ReadinessHistoryResponseDTO getHistory(UUID userId, int days, int page, int size) {
        int resolvedDays = Math.min(Math.max(days, 1), 30);
        Instant cutoff = Instant.now().minus(resolvedDays, ChronoUnit.DAYS);
        int safePage = PaginationUtils.safePage(page);
        int safeSize = PaginationUtils.safeSize(size);

        List<ReadinessCheckInRepository.ReadinessHistoryRow> allRows = readinessCheckInRepository
                .findHistoryByUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(userId, cutoff);
        Double average = readinessCheckInRepository
                .getAverageScoreByUserIdAndCreatedAtGreaterThanEqual(userId, cutoff);
        double resolvedAverage = average == null ? 0.0 : average;

        int fromIndex = Math.min(allRows.size(), safePage * safeSize);
        int toIndex = Math.min(allRows.size(), fromIndex + safeSize);
        List<ReadinessHistoryPointDTO> pageItems = allRows.subList(fromIndex, toIndex).stream()
                .map(row -> new ReadinessHistoryPointDTO(
                        row.getCreatedAt(),
                        calculateScore(
                                row.getSleepQuality(),
                                row.getStressLevel(),
                                row.getSorenessLevel(),
                                row.getConfidenceLevel()
                        ),
                        row.getSleepQuality(),
                        row.getStressLevel(),
                        row.getSorenessLevel(),
                        row.getConfidenceLevel()
                ))
                .toList();

        return new ReadinessHistoryResponseDTO(
                resolvedDays,
                round(resolvedAverage),
                PagedResponse.from(pageItems, safePage, safeSize, allRows.size())
        );
    }

    @Transactional
    public void deleteAllByUser(UUID userId) {
        readinessCheckInRepository.deleteAllByUserId(userId);
    }

    private void validate(short value, String fieldName) {
        if (value < 1 || value > 5) {
            throw new BadRequestException(fieldName + " must be between 1 and 5");
        }
    }

    private short calculateScore(
            short sleepQuality,
            short stressLevel,
            short sorenessLevel,
            short confidenceLevel
    ) {
        int score = sleepQuality + (6 - stressLevel) + (6 - sorenessLevel) + confidenceLevel;
        return (short) Math.max(4, Math.min(score, 20));
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
