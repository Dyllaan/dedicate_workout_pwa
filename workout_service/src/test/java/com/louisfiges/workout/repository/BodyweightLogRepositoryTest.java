package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.core.BodyweightLog;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("BodyweightLogRepository")
class BodyweightLogRepositoryTest {

    @Autowired
    private BodyweightLogRepository bodyweightLogRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("loads bodyweight logs after a persistence-context clear")
    void loadsBodyweightLogAfterClear() {
        UUID userId = UUID.randomUUID();
        BodyweightLog log = bodyweightLogRepository.save(
                new BodyweightLog(userId, BigDecimal.valueOf(80.5), LocalDate.of(2026, 6, 1), "Morning weigh-in")
        );

        bodyweightLogRepository.flush();
        entityManager.clear();

        assertThat(bodyweightLogRepository.findById(log.getId()))
                .isPresent()
                .get()
                .satisfies(found -> {
                    assertThat(found.getUserId()).isEqualTo(userId);
                    assertThat(found.getWeightKg()).isEqualByComparingTo("80.5");
                    assertThat(found.getLoggedAt()).isEqualTo(LocalDate.of(2026, 6, 1));
                    assertThat(found.getNotes()).isEqualTo("Morning weigh-in");
                });
    }
}
