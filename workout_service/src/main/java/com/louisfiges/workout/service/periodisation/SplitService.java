package com.louisfiges.workout.service.periodisation;

import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.SplitDTO;
import com.louisfiges.workout.dto.request.SplitRequest;
import com.louisfiges.workout.dao.periodisation.SplitWorkoutAssignment;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.request.WorkoutFrequencyRequest;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.SplitRepository;
import com.louisfiges.workout.service.workout.WorkoutTemplateService;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;

import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

import java.util.*;

@Service
public class SplitService {

    private final SplitRepository splitRepository;
    private final WorkoutTemplateService workoutTemplateService;
    private final WorkoutEntryRepository workoutEntryRepository;
    private final AnalysisCacheEvictor analysisCacheEvictor;

    @Autowired
    public SplitService(
            SplitRepository splitRepository,
            WorkoutTemplateService workoutTemplateService,
            WorkoutEntryRepository workoutEntryRepository,
            AnalysisCacheEvictor analysisCacheEvictor) {
        this.splitRepository = splitRepository;
        this.workoutTemplateService = workoutTemplateService;
        this.workoutEntryRepository = workoutEntryRepository;
        this.analysisCacheEvictor = analysisCacheEvictor;
    }

    @Transactional(readOnly = true)
    public List<SplitDTO> getAllByUser(UUID userId) {
        return splitRepository.findAllByUserIdWithWorkouts(userId)
                .stream()
                .map(Split::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<SplitDTO> getAllByUser(UUID userId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 25);
        return PagedResponse.from(
                splitRepository.findPageByUserIdWithWorkouts(userId, PageRequest.of(safePage, safeSize))
                        .map(Split::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public SplitDTO getActiveSplit(UUID userId) {
        return splitRepository.findActiveByUserIdWithWorkouts(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No active split found"))
                .toDTO();
    }

    @Transactional(readOnly = true)
    public SplitDTO getById(UUID id, UUID userId) {
        return splitRepository.findByIdAndUserIdWithWorkouts(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Split not found"))
                .toDTO();
    }

    @Transactional
    public SplitDTO create(SplitRequest request, UUID userId) {
        List<WorkoutFrequencyRequest> frequencies = validateWorkoutFrequencies(request.workoutFrequencies());
        Map<UUID, WorkoutTemplate> workoutsById = loadWorkoutsById(frequencies, userId);

        Split split = new Split(request.name(), userId);
        int order = 0;
        for (WorkoutFrequencyRequest freqReq : frequencies) {
            split.addWorkoutAssignment(new SplitWorkoutAssignment(
                    workoutsById.get(freqReq.workoutTemplateId()),
                    freqReq.sessionsPerWeek(),
                    order++
            ));
        }

        SplitDTO response = splitRepository.saveAndFlush(split).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    @Transactional
    public SplitDTO update(UUID id, SplitRequest request, UUID userId) {
        Split split = splitRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Split not found"));

        split.setName(request.name());

        if (request.workoutFrequencies() != null) {
            List<WorkoutFrequencyRequest> frequencies = validateWorkoutFrequencies(request.workoutFrequencies());
            Map<UUID, WorkoutTemplate> workoutsById = loadWorkoutsById(frequencies, userId);

            split.getAssignments().clear();
            splitRepository.flush();

            int order = 0;
            for (WorkoutFrequencyRequest freqReq : frequencies) {
                split.addWorkoutAssignment(new SplitWorkoutAssignment(
                        workoutsById.get(freqReq.workoutTemplateId()),
                        freqReq.sessionsPerWeek(),
                        order++
                ));
            }
        }

        SplitDTO response = splitRepository.saveAndFlush(split).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        Split split = splitRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Split not found"));
        splitRepository.delete(split);
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
    }

    @Transactional
    public SplitDTO setActive(UUID id, UUID userId) {
        splitRepository.deactivateAllForUser(userId);
        Split split = splitRepository.findByIdAndUserIdWithWorkouts(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Split not found"));
        split.setActive(true);
        SplitDTO response = splitRepository.saveAndFlush(split).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    public boolean isSplitOwnedByUser(UUID splitId, UUID userId) {
        return splitRepository.existsByIdAndUserId(splitId, userId);
    }

    public Optional<Split> findByIdAndUserId(UUID id, UUID userId) {
        return splitRepository.findByIdAndUserId(id, userId);
    }

    private List<WorkoutFrequencyRequest> validateWorkoutFrequencies(List<WorkoutFrequencyRequest> frequencyRequests) {
        if (frequencyRequests == null) {
            return List.of();
        }

        Set<UUID> uniqueTemplateIds = new HashSet<>();
        for (WorkoutFrequencyRequest request : frequencyRequests) {
            if (request == null || request.workoutTemplateId() == null) {
                throw new BadRequestException("Workout frequency requires a workout template id");
            }
            if (request.sessionsPerWeek() < 1 || request.sessionsPerWeek() > 7) {
                throw new BadRequestException("Workout frequency must be between 1 and 7 sessions per week");
            }
            if (!uniqueTemplateIds.add(request.workoutTemplateId())) {
                throw new BadRequestException("Workout frequencies must not contain duplicate workout template ids");
            }
        }

        return frequencyRequests;
    }

    private Map<UUID, WorkoutTemplate> loadWorkoutsById(List<WorkoutFrequencyRequest> frequencyRequests, UUID userId) {
        List<UUID> templateIds = frequencyRequests.stream()
                .map(WorkoutFrequencyRequest::workoutTemplateId)
                .toList();
        List<WorkoutTemplate> workouts = workoutTemplateService.findAllByIdsAndUserId(templateIds, userId);

        return workouts.stream().collect(Collectors.toMap(WorkoutTemplate::getId, workout -> workout));
    }

    public SplitWorkoutAssignment getNextAssignment(UUID userId) {
        Split split = splitRepository.findActiveByUserIdWithWorkouts(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No active split found"));

        List<SplitWorkoutAssignment> ordered = split.getAssignments().stream()
                .sorted(Comparator.comparingInt(SplitWorkoutAssignment::getWorkoutOrder))
                .toList();

        if (ordered.isEmpty()) throw new ResourceNotFoundException("No workouts in active split");

        UUID lastTemplateId = workoutEntryRepository.findTopByUserIdOrderByCreatedAtDesc(userId)
                .map(entry -> entry.getTemplate().getId())
                .orElse(null);

        if (lastTemplateId == null) return ordered.get(0);

        for (int i = 0; i < ordered.size(); i++) {
            if (ordered.get(i).getWorkoutTemplate().getId().equals(lastTemplateId)) {
                return ordered.get((i + 1) % ordered.size());
            }
        }

        return ordered.get(0);
    }

    @Transactional
    public SplitDTO updateWorkoutFrequencies(UUID splitId, List<WorkoutFrequencyRequest> frequencies, UUID userId) {
        Split split = splitRepository.findByIdAndUserIdWithWorkouts(splitId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Split not found"));

        Map<UUID, WorkoutFrequencyRequest> freqMap = validateWorkoutFrequencies(frequencies).stream()
            .collect(Collectors.toMap(WorkoutFrequencyRequest::workoutTemplateId, fr -> fr));

        for (SplitWorkoutAssignment assignment : split.getAssignments()) {
            WorkoutFrequencyRequest freqReq = freqMap.get(assignment.getWorkoutTemplate().getId());
            if (freqReq != null) {
                assignment.setSessionsPerWeek(freqReq.sessionsPerWeek());
            }
        }

        SplitDTO response = splitRepository.saveAndFlush(split).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }

    @Transactional
    public SplitDTO updateWorkoutFrequency(UUID splitId, UUID workoutTemplateId, int sessionsPerWeek, UUID userId) {
        Split split = splitRepository.findByIdAndUserIdWithWorkouts(splitId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Split not found"));

        SplitWorkoutAssignment assignment = split.getAssignments().stream()
            .filter(a -> a.getWorkoutTemplate().getId().equals(workoutTemplateId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Workout not found in split"));

        assignment.setSessionsPerWeek(sessionsPerWeek);
        SplitDTO response = splitRepository.saveAndFlush(split).toDTO();
        analysisCacheEvictor.evictAnalysisCachesAfterCommit();
        return response;
    }
}
