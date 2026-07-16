package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.dto.responses.SetEntryWithDateDTO;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.SetEntryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class SetEntryService {

    private final SetEntryRepository setEntryRepository;

    public SetEntryService(
            SetEntryRepository setEntryRepository) {
        this.setEntryRepository = setEntryRepository;
    }

    public List<SetEntryWithDateDTO> getBestSets(UUID userId, String exerciseName) {

        List<SetEntryWithDateDTO> bestSets = setEntryRepository.findBestSetsForExercise(
                userId,
                exerciseName
        );

        if (bestSets.isEmpty()) {
            throw new ResourceNotFoundException("No sets found for exercise " + exerciseName + " in the specified date range");
        }

        return bestSets;
    }
}