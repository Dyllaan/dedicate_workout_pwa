package com.louisfiges.workout.service.core;

import com.louisfiges.workout.dao.core.BodyweightLog;
import com.louisfiges.workout.dto.request.BodyweightLogRequest;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.BodyweightLogDTO;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.BodyweightLogRepository;
import com.louisfiges.workout.service.mapper.BodyweightLogMapper;
import com.louisfiges.workout.util.PaginationUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class BodyweightLogService {

    private static final int MAX_LOGS = 60;

    private final BodyweightLogRepository bodyweightLogRepository;
    private final BodyweightLogMapper bodyweightLogMapper;

    public BodyweightLogService(BodyweightLogRepository bodyweightLogRepository, BodyweightLogMapper bodyweightLogMapper) {
        this.bodyweightLogRepository = bodyweightLogRepository;
        this.bodyweightLogMapper = bodyweightLogMapper;
    }

    public List<BodyweightLogDTO> getAll(UUID userId) {
        return bodyweightLogRepository
                .findByUserIdOrderByLoggedAtDesc(userId, PageRequest.of(0, MAX_LOGS))
                .stream()
                .map(bodyweightLogMapper::toDTO)
                .toList();
    }

    public PagedResponse<BodyweightLogDTO> getAll(UUID userId, int page, int size) {
        return PagedResponse.from(
                bodyweightLogRepository.findPageByUserIdOrderByLoggedAtDesc(userId, PaginationUtils.toPageable(page, size))
                        .map(bodyweightLogMapper::toDTO)
        );
    }

    public BodyweightLogDTO create(UUID userId, BodyweightLogRequest request) {
        BodyweightLog log = new BodyweightLog(
                userId,
                request.weightKg(),
                request.loggedAt(),
                request.notes()
        );
        return bodyweightLogMapper.toDTO(bodyweightLogRepository.save(log));
    }

    public void delete(UUID id, UUID userId) {
        BodyweightLog log = bodyweightLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bodyweight log not found"));
        if (!log.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Bodyweight log not found");
        }
        bodyweightLogRepository.delete(log);
    }

    public void deleteAllByUser(UUID userId) {
        bodyweightLogRepository.deleteAllByUserId(userId);
    }

}
