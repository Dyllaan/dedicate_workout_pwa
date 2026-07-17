package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.heatmap.ExerciseInfoCatalogItemDTO;
import com.louisfiges.workout.repository.ExerciseInfoRepository;
import com.louisfiges.workout.util.PaginationUtils;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class ExerciseInfoCatalogService {

    private static final List<String> QUICK_PICK_EXERCISE_NAMES = List.of(
            "Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row",
            "Pull-ups", "Dips", "Leg Press", "Romanian Deadlift", "Lateral Raises"
    );

    private final ExerciseInfoRepository exerciseInfoRepository;

    public ExerciseInfoCatalogService(ExerciseInfoRepository exerciseInfoRepository) {
        this.exerciseInfoRepository = exerciseInfoRepository;
    }

    public List<ExerciseInfoCatalogItemDTO> searchCatalog(String query, Integer limit) {
        int safeLimit = limit == null ? 20 : Math.max(1, Math.min(limit, 50));
        return searchCatalogInternal(query).stream()
                .limit(safeLimit)
                .toList();
    }

    public PagedResponse<ExerciseInfoCatalogItemDTO> searchCatalog(String query, int page, int size) {
        int safePage = PaginationUtils.safePage(page);
        int safeSize = PaginationUtils.safeSize(size);
        List<ExerciseInfoCatalogItemDTO> results = searchCatalogInternal(query);
        int fromIndex = Math.min(results.size(), safePage * safeSize);
        int toIndex = Math.min(results.size(), fromIndex + safeSize);
        return PagedResponse.from(results.subList(fromIndex, toIndex), safePage, safeSize, results.size());
    }

    public List<ExerciseInfoCatalogItemDTO> getQuickPicks(Integer limit) {
        int safeLimit = limit == null ? QUICK_PICK_EXERCISE_NAMES.size() : Math.max(1, Math.min(limit, QUICK_PICK_EXERCISE_NAMES.size()));
        return buildQuickPicks().stream()
                .limit(safeLimit)
                .toList();
    }

    public PagedResponse<ExerciseInfoCatalogItemDTO> getQuickPicks(int page, int size) {
        int safePage = PaginationUtils.safePage(page);
        int safeSize = PaginationUtils.safeSize(size);
        List<ExerciseInfoCatalogItemDTO> quickPicks = buildQuickPicks();
        int fromIndex = Math.min(quickPicks.size(), safePage * safeSize);
        int toIndex = Math.min(quickPicks.size(), fromIndex + safeSize);
        return PagedResponse.from(quickPicks.subList(fromIndex, toIndex), safePage, safeSize, quickPicks.size());
    }

    private List<ExerciseInfoCatalogItemDTO> searchCatalogInternal(String query) {
        String trimmed = query == null ? "" : query.trim();
        List<ExerciseInfo> catalog = exerciseInfoRepository.findAllByOrderByNameAscVariationAsc().stream()
                .sorted(Comparator.comparing(ExerciseInfo::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        if (trimmed.isBlank()) {
            return catalog.stream()
                    .map(this::toCatalogItemDto)
                    .toList();
        }

        String normalizedQuery = normalizeCatalogSearchValue(trimmed);
        List<String> tokens = tokenizeCatalogSearchValue(normalizedQuery);
        return catalog.stream()
                .map(item -> scoreCatalogCandidate(item, normalizedQuery, tokens))
                .filter(CatalogSearchCandidate::matches)
                .sorted(Comparator
                        .comparing(CatalogSearchCandidate::exactMatch).reversed()
                        .thenComparing(CatalogSearchCandidate::startsWithMatch).reversed()
                        .thenComparing(CatalogSearchCandidate::phraseMatch).reversed()
                        .thenComparing(CatalogSearchCandidate::matchedTokenCount).reversed()
                        .thenComparing(c -> c.item().getName(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(c -> emptyToNull(c.item().getVariation()) == null ? "" : c.item().getVariation(), String.CASE_INSENSITIVE_ORDER))
                .map(c -> toCatalogItemDto(c.item()))
                .toList();
    }

    private List<ExerciseInfoCatalogItemDTO> buildQuickPicks() {
        List<ExerciseInfo> catalog = exerciseInfoRepository.findAllByOrderByNameAscVariationAsc();
        Set<String> seenNames = new LinkedHashSet<>();
        List<ExerciseInfoCatalogItemDTO> quickPicks = new ArrayList<>();

        for (String label : QUICK_PICK_EXERCISE_NAMES) {
            findBestQuickPickMatch(label, catalog).ifPresent(item -> {
                if (seenNames.add(normalizeCatalogSearchValue(item.getName()))) {
                    quickPicks.add(toCatalogItemDto(item));
                }
            });
        }
        return quickPicks;
    }

    private ExerciseInfoCatalogItemDTO toCatalogItemDto(ExerciseInfo item) {
        return new ExerciseInfoCatalogItemDTO(
                item.getId(),
                item.getName(),
                item.getVariation(),
                lookupName(item.getEquipmentLookup()),
                lookupName(item.getMainMuscleLookup())
        );
    }

    private java.util.Optional<ExerciseInfo> findBestQuickPickMatch(String label, List<ExerciseInfo> catalog) {
        String normalizedLabel = normalizeCatalogSearchValue(label);
        List<String> tokens = tokenizeCatalogSearchValue(normalizedLabel);
        return catalog.stream()
                .filter(item -> lookupName(item.getMainMuscleLookup()) != null)
                .map(item -> scoreCatalogCandidate(item, normalizedLabel, tokens))
                .filter(CatalogSearchCandidate::matches)
                .sorted(Comparator
                        .comparing(CatalogSearchCandidate::exactMatch).reversed()
                        .thenComparing(CatalogSearchCandidate::startsWithMatch).reversed()
                        .thenComparing(CatalogSearchCandidate::phraseMatch).reversed()
                        .thenComparing(CatalogSearchCandidate::matchedTokenCount).reversed()
                        .thenComparing(c -> emptyToNull(c.item().getVariation()) == null ? "" : c.item().getVariation(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(c -> c.item().getName(), String.CASE_INSENSITIVE_ORDER))
                .map(CatalogSearchCandidate::item)
                .findFirst();
    }

    private CatalogSearchCandidate scoreCatalogCandidate(ExerciseInfo item, String normalizedQuery, List<String> tokens) {
        String combined = normalizeCatalogSearchValue(item.getName() + " " + (item.getVariation() == null ? "" : item.getVariation()));
        boolean exactMatch = !normalizedQuery.isBlank() && combined.equals(normalizedQuery);
        boolean startsWithMatch = !normalizedQuery.isBlank() && combined.startsWith(normalizedQuery);
        boolean phraseMatch = !normalizedQuery.isBlank() && combined.contains(normalizedQuery);
        long matchedTokenCount = tokens.stream().filter(combined::contains).count();
        return new CatalogSearchCandidate(item, exactMatch, startsWithMatch, phraseMatch, matchedTokenCount);
    }

    private List<String> tokenizeCatalogSearchValue(String normalizedQuery) {
        if (normalizedQuery.isBlank()) {
            return List.of();
        }
        return Arrays.stream(normalizedQuery.split(" "))
                .filter(token -> token.length() >= 2)
                .distinct()
                .toList();
    }

    private String normalizeCatalogSearchValue(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String lookupName(Object lookup) {
        if (lookup instanceof com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment equipment) {
            return equipment.getName();
        }
        if (lookup instanceof com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup muscleGroup) {
            return muscleGroup.getName();
        }
        return null;
    }

    private record CatalogSearchCandidate(
            ExerciseInfo item,
            boolean exactMatch,
            boolean startsWithMatch,
            boolean phraseMatch,
            long matchedTokenCount
    ) {
        boolean matches() {
            return phraseMatch || matchedTokenCount > 0;
        }
    }
}
