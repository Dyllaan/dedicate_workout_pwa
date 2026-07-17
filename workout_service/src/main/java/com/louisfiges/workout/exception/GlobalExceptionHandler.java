package com.louisfiges.workout.exception;

import com.louisfiges.workout.dto.StringErrorResponse;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.NoPermissionException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * @author Louis Figes
 */
@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);


    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<StringErrorResponse> handleNotFound(com.louisfiges.workout.exception.exceptions.ResourceNotFoundException ex) {
        StringErrorResponse errorDTO = new StringErrorResponse(ex.getMessage());
        return new ResponseEntity<>(errorDTO, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(NoPermissionException.class)
    public ResponseEntity<StringErrorResponse> handleNoPermission(com.louisfiges.workout.exception.exceptions.NoPermissionException ex) {
        StringErrorResponse errorDTO = new StringErrorResponse(ex.getMessage());
        return new ResponseEntity<>(errorDTO, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<StringErrorResponse> handleBadRequest(com.louisfiges.workout.exception.exceptions.BadRequestException ex) {
        StringErrorResponse errorDTO = new StringErrorResponse(ex.getMessage());
        return new ResponseEntity<>(errorDTO, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<StringErrorResponse> handleOptimisticLock(OptimisticLockingFailureException ex) {
        StringErrorResponse errorDTO = new StringErrorResponse("Resource was modified by another request. Please reload and try again.");
        return new ResponseEntity<>(errorDTO, HttpStatus.CONFLICT);
    }

    /**
     * Standard error response for generic exceptions.
     * @param ex the exception
     * @return a response entity with  500 internal server error
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<StringErrorResponse> handleGenericException(Exception ex) {
        logger.error(ex.getMessage(), ex);
        StringErrorResponse errorDTO = new StringErrorResponse("Internal Server Error");
        return new ResponseEntity<>(errorDTO, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Override the default handler for HttpMessageNotReadableException
     * provided by ResponseEntityExceptionHandler.
     */
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            @NonNull HttpMessageNotReadableException ex,
            @NonNull HttpHeaders headers,
            @NonNull HttpStatusCode status,
            @NonNull WebRequest request
    ) {
        logger.error(ex.getMessage(), ex);
        StringErrorResponse errorDTO = new StringErrorResponse("Invalid request, please check API documentation");
        return new ResponseEntity<>(errorDTO, HttpStatus.BAD_REQUEST);
    }
}
