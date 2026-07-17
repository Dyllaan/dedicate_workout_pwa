package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.SetEntryDTO;
import org.springframework.stereotype.Component;

@Component
public class SetEntryMapper {

    public SetEntryDTO toDTO(SetEntry entity) {
        return new SetEntryDTO(entity.getId(), entity.getReps(), entity.getWeight(), entity.getRpe(), entity.getNotes(), entity.getSetRole(), entity.getRestBeforeSeconds());
    }
}
