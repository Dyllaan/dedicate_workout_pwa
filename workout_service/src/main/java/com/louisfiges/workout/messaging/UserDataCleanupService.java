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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserDataCleanupService {

    private static final Logger logger = LoggerFactory.getLogger(UserDataCleanupService.class);

    private final WorkoutEntryRepository workoutEntryRepository;
    private final ProgrammeRepository programmeRepository;
    private final SplitRepository splitRepository;
    private final WorkoutTemplateRepository workoutTemplateRepository;
    private final BodyweightLogService bodyweightLogService;
    private final ReadinessService readinessService;

    public UserDataCleanupService(
            WorkoutEntryRepository workoutEntryRepository,
            ProgrammeRepository programmeRepository,
            SplitRepository splitRepository,
            WorkoutTemplateRepository workoutTemplateRepository,
            BodyweightLogService bodyweightLogService,
            ReadinessService readinessService
    ) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.programmeRepository = programmeRepository;
        this.splitRepository = splitRepository;
        this.workoutTemplateRepository = workoutTemplateRepository;
        this.bodyweightLogService = bodyweightLogService;
        this.readinessService = readinessService;
    }

    @Transactional
    public void deleteAllUserData(UUID userId) {
        List<WorkoutEntry> entries = workoutEntryRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Split> splits = splitRepository.findByUserId(userId);
        List<Programme> programmes = programmeRepository.findAllByUserId(userId);
        List<WorkoutTemplate> templates = workoutTemplateRepository.findByUserId(userId);

        bodyweightLogService.deleteAllByUser(userId);
        readinessService.deleteAllByUser(userId);
        UserCleanupResult cleanupResult = deleteCleanupTargets(entries, splits, programmes, templates);
        logCleanupResult(userId, cleanupResult);
    }

    private UserCleanupResult deleteCleanupTargets(
            List<WorkoutEntry> entries,
            List<Split> splits,
            List<Programme> programmes,
            List<WorkoutTemplate> templates
    ) {
        workoutEntryRepository.deleteAll(entries);
        workoutEntryRepository.flush();

        splitRepository.deleteAll(splits);
        splitRepository.flush();

        programmeRepository.deleteAll(programmes);
        programmeRepository.flush();

        workoutTemplateRepository.deleteAll(templates);
        workoutTemplateRepository.flush();

        return new UserCleanupResult(entries.size(), programmes.size(), splits.size(), templates.size());
    }

    private void logCleanupResult(UUID userId, UserCleanupResult cleanupResult) {
        logger.info(
                "Deleted workout data for userId={} entries={} programmes={} splits={} templates={}",
                userId,
                cleanupResult.deletedEntries(),
                cleanupResult.deletedProgrammes(),
                cleanupResult.deletedSplits(),
                cleanupResult.deletedTemplates()
        );
    }
}
