package com.louisfiges.workout.service;

import com.louisfiges.workout.dao.settings.WorkoutUserSettings;
import com.louisfiges.workout.dto.request.WorkoutUserSettingsRequest;
import com.louisfiges.workout.dto.responses.WorkoutUserSettingsDTO;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.repository.WorkoutUserSettingsRepository;
import com.louisfiges.workout.service.core.WorkoutUserSettingsService;
import com.louisfiges.workout.service.mapper.WorkoutUserSettingsMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkoutUserSettingsService")
class WorkoutUserSettingsServiceTest {

    @Mock
    private WorkoutUserSettingsRepository repository;

    private final WorkoutUserSettingsMapper workoutUserSettingsMapper = new WorkoutUserSettingsMapper();

    private WorkoutUserSettingsService service;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new WorkoutUserSettingsService(repository, workoutUserSettingsMapper);
        userId = UUID.randomUUID();
    }

    @Test
    @DisplayName("returns default 90 second rest setting when user has no settings row")
    void returnsDefaultWhenNoSettingsRowExists() {
        when(repository.findById(userId)).thenReturn(Optional.empty());

        WorkoutUserSettingsDTO result = service.getForUser(userId);

        assertThat(result.defaultRestSeconds()).isEqualTo(90);
    }

    @Test
    @DisplayName("updates default rest seconds for the authenticated user")
    void updatesDefaultRestSeconds() {
        WorkoutUserSettings existing = new WorkoutUserSettings(userId, 90);
        when(repository.findById(userId)).thenReturn(Optional.of(existing));
        when(repository.save(any(WorkoutUserSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WorkoutUserSettingsDTO result = service.updateForUser(userId, new WorkoutUserSettingsRequest(120));

        assertThat(result.defaultRestSeconds()).isEqualTo(120);
        assertThat(existing.getDefaultRestSeconds()).isEqualTo(120);
    }

    @Test
    @DisplayName("creates a settings row when updating for the first time")
    void createsSettingsRowWhenUpdatingForFirstTime() {
        ArgumentCaptor<WorkoutUserSettings> captor = ArgumentCaptor.forClass(WorkoutUserSettings.class);
        when(repository.findById(userId)).thenReturn(Optional.empty());
        when(repository.save(any(WorkoutUserSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateForUser(userId, new WorkoutUserSettingsRequest(75));

        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(userId);
        assertThat(captor.getValue().getDefaultRestSeconds()).isEqualTo(75);
    }

    @Test
    @DisplayName("rejects rest settings outside the supported range")
    void rejectsInvalidRestSettings() {
        assertThatThrownBy(() -> service.updateForUser(userId, new WorkoutUserSettingsRequest(7201)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Rest time must be between 0 and 7200 seconds");
    }
}
