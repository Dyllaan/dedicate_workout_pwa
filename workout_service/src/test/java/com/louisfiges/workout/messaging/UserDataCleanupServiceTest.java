package com.louisfiges.workout.messaging;

import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.repository.ProgrammeRepository;
import com.louisfiges.workout.repository.SplitRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.service.core.BodyweightLogService;
import com.louisfiges.workout.service.workout.ReadinessService;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserDataCleanupService")
class UserDataCleanupServiceTest {

    @Mock
    private WorkoutEntryRepository workoutEntryRepository;

    @Mock
    private ProgrammeRepository programmeRepository;

    @Mock
    private SplitRepository splitRepository;

    @Mock
    private WorkoutTemplateRepository workoutTemplateRepository;

    @Mock
    private BodyweightLogService bodyweightLogService;

    @Mock
    private ReadinessService readinessService;

    @InjectMocks
    private UserDataCleanupService userDataCleanupService;

    @Test
    @DisplayName("deletes user-owned workout data in foreign-key-safe order")
    void deletesUserOwnedWorkoutDataInOrder() {
        UUID userId = UUID.randomUUID();
        List<WorkoutEntry> entries = List.of(new WorkoutEntry());
        List<Programme> programmes = List.of(new Programme());
        List<Split> splits = List.of(new Split());
        List<WorkoutTemplate> templates = List.of(new WorkoutTemplate());

        when(workoutEntryRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(entries);
        when(programmeRepository.findAllByUserId(userId)).thenReturn(programmes);
        when(splitRepository.findByUserId(userId)).thenReturn(splits);
        when(workoutTemplateRepository.findByUserId(userId)).thenReturn(templates);

        userDataCleanupService.deleteAllUserData(userId);

        InOrder inOrder = inOrder(
                bodyweightLogService,
                readinessService,
                workoutEntryRepository,
                splitRepository,
                programmeRepository,
                workoutTemplateRepository
        );

        inOrder.verify(bodyweightLogService).deleteAllByUser(userId);
        inOrder.verify(readinessService).deleteAllByUser(userId);
        inOrder.verify(workoutEntryRepository).deleteAll(entries);
        inOrder.verify(workoutEntryRepository).flush();
        inOrder.verify(splitRepository).deleteAll(splits);
        inOrder.verify(splitRepository).flush();
        inOrder.verify(programmeRepository).deleteAll(programmes);
        inOrder.verify(programmeRepository).flush();
        inOrder.verify(workoutTemplateRepository).deleteAll(templates);
        inOrder.verify(workoutTemplateRepository).flush();
    }
}
