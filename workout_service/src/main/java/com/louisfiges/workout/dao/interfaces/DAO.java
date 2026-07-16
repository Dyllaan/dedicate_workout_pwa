package com.louisfiges.workout.dao.interfaces;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

public interface DAO<T extends DTO> {
    T toDTO();
}