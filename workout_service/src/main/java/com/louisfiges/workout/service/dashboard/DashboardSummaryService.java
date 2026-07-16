package com.louisfiges.workout.service.dashboard;

import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dto.responses.dashboard.DashboardActiveSplitDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardNextWorkoutDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardPreviewExerciseDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardSummaryDTO;
import com.louisfiges.workout.repository.ProgrammeRepository;
import com.louisfiges.workout.repository.SplitRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.service.analysis.LiftSummaryService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class DashboardSummaryService {

    private static final int NEXT_WORKOUT_HISTORY_LIMIT = 20;
    private final Random random = new Random();

    private final WorkoutEntryRepository workoutEntryRepository;
    private final ProgrammeRepository programmeRepository;
    private final WorkoutTemplateRepository workoutTemplateRepository;
    private final SplitRepository splitRepository;
    private final LiftSummaryService liftSummaryService;

    public DashboardSummaryService(
            WorkoutEntryRepository workoutEntryRepository,
            WorkoutTemplateRepository workoutTemplateRepository,
            SplitRepository splitRepository,
            LiftSummaryService liftSummaryService,
            ProgrammeRepository programmeRepository
    ) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.workoutTemplateRepository = workoutTemplateRepository;
        this.splitRepository = splitRepository;
        this.liftSummaryService = liftSummaryService;
        this.programmeRepository = programmeRepository;
    }

    public DashboardSummaryDTO getSummary(UUID userId) {
        int workoutTemplateCount = Math.toIntExact(workoutTemplateRepository.countByUserId(userId));
        int splitCount = Math.toIntExact(splitRepository.countByUserId(userId));
        Optional<Split> activeSplit = splitRepository.findActiveByUserIdWithWorkouts(userId);
        boolean hasLoggedWorkout = workoutEntryRepository.existsByUserId(userId);
        boolean hasCreatedProgramme = programmeRepository.existsBySplitUserId(userId);

        List<WorkoutEntry> recentHistory = workoutEntryRepository.findDetailedHistoryByUserId(
                userId,
                PageRequest.of(0, NEXT_WORKOUT_HISTORY_LIMIT)
        );

        // Resolve next workout: Try active split sequence first; fall back to random template if empty.
        Optional<DashboardNextWorkoutDTO> nextWorkoutDTO = Optional.empty();
        if (activeSplit.isPresent()) {
            nextWorkoutDTO = buildNextWorkoutFromSplit(activeSplit.get(), recentHistory);
        } else {
            nextWorkoutDTO = buildRandomNextWorkout(userId, recentHistory);
        }

        return new DashboardSummaryDTO(
                workoutTemplateCount,
                splitCount,
                activeSplit.map(split -> new DashboardActiveSplitDTO(split.getId(), split.getName())).orElse(null),
                nextWorkoutDTO.orElse(null),
                liftSummaryService.getOverallLiftSummary(userId).orElse(null),
                hasLoggedWorkout,
                hasCreatedProgramme
        );
    }

    private Optional<DashboardNextWorkoutDTO> buildNextWorkoutFromSplit(Split split, List<WorkoutEntry> history) {
        List<WorkoutTemplate> workouts = orderedWorkouts(split);
        if (workouts.isEmpty()) {
            return Optional.empty();
        }

        WorkoutTemplate nextWorkout = resolveNextWorkout(workouts, history);
        if (nextWorkout == null) {
            return Optional.empty();
        }

        return Optional.of(mapToNextWorkoutDTO(nextWorkout, history));
    }

    private Optional<DashboardNextWorkoutDTO> buildRandomNextWorkout(UUID userId, List<WorkoutEntry> history) {
        List<WorkoutTemplate> allTemplates = workoutTemplateRepository.findByUserId(userId);

        if (allTemplates == null || allTemplates.isEmpty()) {
            return Optional.empty();
        }

        WorkoutTemplate randomWorkout = allTemplates.get(random.nextInt(allTemplates.size()));
        return Optional.of(mapToNextWorkoutDTO(randomWorkout, history));
    }

    // Extracted mapping logic so it can be reused by both Split-based and Random-based flows
    private DashboardNextWorkoutDTO mapToNextWorkoutDTO(WorkoutTemplate nextWorkout, List<WorkoutEntry> history) {
        WorkoutEntry previousEntry = history.stream()
                .filter(entry -> entry.getTemplate().getId().equals(nextWorkout.getId()))
                .findFirst()
                .orElse(null);

        Integer lastSetCount = previousEntry == null
                ? null
                : previousEntry.getExercises().stream().mapToInt(exercise -> exercise.getSets().size()).sum();

        List<DashboardPreviewExerciseDTO> previewExercises = nextWorkout.getExercises().stream()
                .limit(6)
                .map(exercise -> new DashboardPreviewExerciseDTO(
                        exercise.getExerciseDefinition() != null
                                ? exercise.getExerciseDefinition().getExerciseName()
                                : nextWorkout.getName(),
                        exercise.getExerciseDefinition() != null
                                ? exercise.getExerciseDefinition().getVariant()
                                : null,
                        exercise.getGoalSets()
                ))
                .toList();

        return new DashboardNextWorkoutDTO(
                nextWorkout.getId(),
                nextWorkout.getName(),
                nextWorkout.getCategory(),
                previewExercises,
                Math.max(0, nextWorkout.getExercises().size() - previewExercises.size()),
                previousEntry == null ? null : previousEntry.getCreatedAt(),
                lastSetCount
        );
    }

    private WorkoutTemplate resolveNextWorkout(List<WorkoutTemplate> workouts, List<WorkoutEntry> history) {
        Map<UUID, Integer> indexByWorkoutId = new HashMap<>();
        for (int i = 0; i < workouts.size(); i++) {
            indexByWorkoutId.put(workouts.get(i).getId(), i);
        }

        WorkoutEntry lastSplitEntry = history.stream()
                .filter(entry -> indexByWorkoutId.containsKey(entry.getTemplate().getId()))
                .findFirst()
                .orElse(null);
        if (lastSplitEntry == null) {
            return workouts.get(0);
        }

        Integer currentIndex = indexByWorkoutId.get(lastSplitEntry.getTemplate().getId());
        return currentIndex == null ? workouts.get(0) : workouts.get((currentIndex + 1) % workouts.size());
    }

    private List<WorkoutTemplate> orderedWorkouts(Split split) {
        Map<UUID, WorkoutTemplate> detailedById = new HashMap<>();
        for (var assignment : split.getAssignments()) {
            detailedById.put(assignment.getWorkoutTemplate().getId(), assignment.getWorkoutTemplate());
        }

        List<WorkoutTemplate> workouts = new ArrayList<>();
        split.getAssignments().stream()
                .sorted(Comparator.comparingInt(assignment -> assignment.getWorkoutOrder()))
                .forEach(assignment -> {
                    WorkoutTemplate workout = detailedById.get(assignment.getWorkoutTemplate().getId());
                    if (workout != null) {
                        workouts.add(workout);
                    }
                });
        return workouts;
    }
}