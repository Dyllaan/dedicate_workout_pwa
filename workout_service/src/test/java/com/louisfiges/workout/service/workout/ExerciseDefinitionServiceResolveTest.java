package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dto.request.ExerciseDefinitionResolveRequest;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionResolveResponseDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.repository.ExerciseConfigRepository;
import com.louisfiges.workout.repository.ExerciseDefinitionRepository;
import com.louisfiges.workout.repository.ExerciseDefinitionUsageSummaryRow;
import com.louisfiges.workout.repository.ExerciseEntryRepository;
import com.louisfiges.workout.repository.ExerciseInfoRepository;
import com.louisfiges.workout.repository.ProgrammeRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("ExerciseDefinitionService resolve")
class ExerciseDefinitionServiceResolveTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000321");

    @Test
    @DisplayName("returns a single catalog-backed match when one existing definition uses that exercise info id")
    void resolvesSingleCatalogMatch() {
        ExerciseDefinitionRepository definitionRepository = mock(ExerciseDefinitionRepository.class);
        ExerciseEntryRepository entryRepository = mock(ExerciseEntryRepository.class);
        ExerciseDefinition definition = buildDefinition(
                UUID.fromString("00000000-0000-0000-0000-000000000111"),
                "Bench Press",
                "Barbell",
                44L,
                Instant.parse("2026-06-01T08:00:00Z")
        );

        when(definitionRepository.findAllByUserIdAndExerciseInfo_Id(USER_ID, 44L)).thenReturn(List.of(definition));
        when(entryRepository.summarizeUsageByDefinitionIds(eq(USER_ID), anyCollection())).thenReturn(List.of(
                new ExerciseDefinitionUsageSummaryRow(
                        definition.getId(),
                        5,
                        Instant.parse("2026-07-01T08:00:00Z")
                )
        ));

        ExerciseDefinitionService service = buildService(definitionRepository, entryRepository);

        ExerciseDefinitionResolveResponseDTO response = service.resolveForSearch(
                USER_ID,
                new ExerciseDefinitionResolveRequest("bench press", 44L, "Bench Press", "Barbell")
        );

        assertThat(response.status()).isEqualTo("single_match");
        assertThat(response.suggestedDefinitionId()).isEqualTo(definition.getId());
        assertThat(response.matches()).singleElement().satisfies(match -> {
            assertThat(match.id()).isEqualTo(definition.getId());
            assertThat(match.sessionCount()).isEqualTo(5);
        });
    }

    @Test
    @DisplayName("returns ranked multiple matches when several definitions share a catalog exercise")
    void resolvesMultipleCatalogMatches() {
        ExerciseDefinitionRepository definitionRepository = mock(ExerciseDefinitionRepository.class);
        ExerciseEntryRepository entryRepository = mock(ExerciseEntryRepository.class);
        ExerciseDefinition mostUsed = buildDefinition(
                UUID.fromString("00000000-0000-0000-0000-000000000222"),
                "Bench Press",
                "Barbell",
                44L,
                Instant.parse("2026-05-01T08:00:00Z")
        );
        ExerciseDefinition lessUsed = buildDefinition(
                UUID.fromString("00000000-0000-0000-0000-000000000333"),
                "Bench Press",
                "Paused",
                44L,
                Instant.parse("2026-04-01T08:00:00Z")
        );

        when(definitionRepository.findAllByUserIdAndExerciseInfo_Id(USER_ID, 44L)).thenReturn(List.of(lessUsed, mostUsed));
        when(entryRepository.summarizeUsageByDefinitionIds(eq(USER_ID), anyCollection())).thenReturn(List.of(
                new ExerciseDefinitionUsageSummaryRow(lessUsed.getId(), 1, Instant.parse("2026-06-01T08:00:00Z")),
                new ExerciseDefinitionUsageSummaryRow(mostUsed.getId(), 4, Instant.parse("2026-07-01T08:00:00Z"))
        ));

        ExerciseDefinitionService service = buildService(definitionRepository, entryRepository);

        ExerciseDefinitionResolveResponseDTO response = service.resolveForSearch(
                USER_ID,
                new ExerciseDefinitionResolveRequest("bench press", 44L, "Bench Press", "Barbell")
        );

        assertThat(response.status()).isEqualTo("multiple_matches");
        assertThat(response.suggestedDefinitionId()).isEqualTo(mostUsed.getId());
        assertThat(response.matches()).extracting(match -> match.id()).containsExactly(
                mostUsed.getId(),
                lessUsed.getId()
        );
    }

    @Test
    @DisplayName("reuses typed custom definitions for close formatting differences but not broad aliases")
    void resolvesTypedCustomMatchesSafely() {
        ExerciseDefinitionRepository definitionRepository = mock(ExerciseDefinitionRepository.class);
        ExerciseEntryRepository entryRepository = mock(ExerciseEntryRepository.class);
        ExerciseDefinition closeMatch = buildDefinition(
                UUID.fromString("00000000-0000-0000-0000-000000000444"),
                "Cable Fly Press",
                null,
                null,
                Instant.parse("2026-05-01T08:00:00Z")
        );
        ExerciseDefinition aliasCandidate = buildDefinition(
                UUID.fromString("00000000-0000-0000-0000-000000000555"),
                "Overhead Press",
                null,
                null,
                Instant.parse("2026-05-02T08:00:00Z")
        );

        when(definitionRepository.findByUserIdOrderByExerciseNameAscVariantAsc(USER_ID)).thenReturn(List.of(closeMatch, aliasCandidate));
        when(entryRepository.summarizeUsageByDefinitionIds(eq(USER_ID), anyCollection())).thenReturn(List.of());

        ExerciseDefinitionService service = buildService(definitionRepository, entryRepository);

        ExerciseDefinitionResolveResponseDTO closeResponse = service.resolveForSearch(
                USER_ID,
                new ExerciseDefinitionResolveRequest("Cable Fly-Press", null, "Cable Fly-Press", null)
        );
        ExerciseDefinitionResolveResponseDTO aliasResponse = service.resolveForSearch(
                USER_ID,
                new ExerciseDefinitionResolveRequest("OHP", null, "OHP", null)
        );

        assertThat(closeResponse.status()).isEqualTo("single_match");
        assertThat(closeResponse.suggestedDefinitionId()).isEqualTo(closeMatch.getId());
        assertThat(aliasResponse.status()).isEqualTo("no_match");
        assertThat(aliasResponse.matches()).isEmpty();
    }

    @Test
    @DisplayName("resolveForUser prefers an existing catalog-backed definition before creating a new one")
    void resolveForUserPrefersExistingCatalogDefinition() {
        ExerciseDefinitionRepository definitionRepository = mock(ExerciseDefinitionRepository.class);
        ExerciseEntryRepository entryRepository = mock(ExerciseEntryRepository.class);
        ExerciseDefinition existing = buildDefinition(
                UUID.fromString("00000000-0000-0000-0000-000000000666"),
                "Bench Press",
                "Barbell",
                44L,
                Instant.parse("2026-05-01T08:00:00Z")
        );

        when(definitionRepository.findAllByUserIdAndExerciseInfo_Id(USER_ID, 44L)).thenReturn(List.of(existing));
        when(entryRepository.summarizeUsageByDefinitionIds(eq(USER_ID), anyCollection())).thenReturn(List.of());

        ExerciseDefinitionService service = buildService(definitionRepository, entryRepository);

        ExerciseDefinition resolved = service.resolveForUser(USER_ID, null, "Bench Press", "Barbell", 44L);

        assertThat(resolved).isEqualTo(existing);
        verify(definitionRepository, never()).save(org.mockito.ArgumentMatchers.any(ExerciseDefinition.class));
        verify(definitionRepository, never()).findByUserIdAndNormalizedExerciseNameAndNormalizedVariant(eq(USER_ID), eq("bench_press"), eq("barbell"));
    }

    private ExerciseDefinitionService buildService(
            ExerciseDefinitionRepository definitionRepository,
            ExerciseEntryRepository entryRepository
    ) {
        return new ExerciseDefinitionService(
                definitionRepository,
                mock(ExerciseConfigRepository.class),
                entryRepository,
                mock(ExerciseInfoRepository.class),
                mock(WorkoutTemplateRepository.class),
                mock(WorkoutEntryRepository.class),
                mock(ProgrammeRepository.class),
                mock(AnalysisCacheEvictor.class)
        );
    }

    private ExerciseDefinition buildDefinition(UUID id, String exerciseName, String variant, Long exerciseInfoId, Instant createdAt) {
        ExerciseDefinition definition = new ExerciseDefinition();
        ReflectionTestUtils.setField(definition, "id", id);
        ReflectionTestUtils.setField(definition, "createdAt", createdAt);
        definition.setUserId(USER_ID);
        definition.setExerciseName(exerciseName);
        definition.setVariant(variant);
        definition.setNormalizedExerciseName(exerciseName == null ? "" : exerciseName.trim().toLowerCase().replaceAll("[^a-z0-9]+", "_").replaceAll("_+", "_").replaceAll("^_|_$", ""));
        definition.setNormalizedVariant(variant == null ? "" : variant.trim().toLowerCase().replaceAll("[^a-z0-9]+", "_").replaceAll("_+", "_").replaceAll("^_|_$", ""));
        definition.setMappingSource(exerciseInfoId == null ? MappingSource.AUTO : MappingSource.CATALOG);
        definition.setSecondaryMuscles(new LinkedHashSet<>());
        if (exerciseInfoId != null) {
            ExerciseInfo info = new ExerciseInfo();
            ReflectionTestUtils.setField(info, "id", exerciseInfoId);
            definition.setExerciseInfo(info);
        }
        return definition;
    }
}
