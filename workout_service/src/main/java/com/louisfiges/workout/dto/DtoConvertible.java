package com.louisfiges.workout.dto;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

public interface DtoConvertible<T extends DTO> {
    T toDTO();
}
