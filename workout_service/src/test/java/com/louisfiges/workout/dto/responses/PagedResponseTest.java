package com.louisfiges.workout.dto.responses;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PagedResponseTest {

    @Test
    void serializesPagedEnvelopeWithItemsAndMetadata() {
        PagedResponse<String> response = new PagedResponse<>(
                List.of("a", "b"),
                0,
                2,
                5,
                3,
                true,
                false
        );

        assertThat(response.items()).containsExactly("a", "b");
        assertThat(response.page()).isEqualTo(0);
        assertThat(response.size()).isEqualTo(2);
        assertThat(response.totalItems()).isEqualTo(5);
        assertThat(response.totalPages()).isEqualTo(3);
        assertThat(response.hasNext()).isTrue();
        assertThat(response.hasPrevious()).isFalse();
    }
}
