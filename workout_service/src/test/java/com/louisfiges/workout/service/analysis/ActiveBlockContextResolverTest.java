package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.types.BlockContext;
import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.periodisation.BlockType;
import com.louisfiges.workout.repository.SplitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActiveBlockContextResolverTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000111");

    @Mock
    private SplitRepository splitRepository;

    private ActiveBlockContextResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new ActiveBlockContextResolver(splitRepository);
    }

    @Test
    void resolvesBlockContextForActiveProgramme() {
        Split split = new Split("Split", USER_ID);
        ReflectionTestUtils.setField(split, "id", UUID.randomUUID());
        split.setActive(true);

        Programme programme = new Programme();
        ReflectionTestUtils.setField(programme, "id", UUID.randomUUID());
        programme.setSplit(split);
        programme.setActive(true);
        programme.setStartDate(Instant.now().minus(4, ChronoUnit.DAYS));

        Block block = new Block(
                programme,
                "Block A",
                BlockType.STRENGTH,
                ProgressionStrategy.WEIGHT_FIRST,
                4,
                7.0,
                9.0,
                4,
                6,
                0,
                Instant.now().minus(4, ChronoUnit.DAYS)
        );
        ReflectionTestUtils.setField(block, "id", UUID.randomUUID());

        Week week = new Week();
        ReflectionTestUtils.setField(week, "id", UUID.randomUUID());
        week.setBlock(block);
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(3);
        week.setRpeOverrideMin(7.5);
        week.setRpeOverrideMax(8.5);
        block.setWeeks(List.of(week));
        programme.setBlocks(List.of(block));
        split.getProgrammes().add(programme);

        when(splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(split));

        ActiveBlockContextResolver.ResolvedActiveBlockContext resolved = resolver.resolve(USER_ID);

        BlockContext context = resolved.blockContext();
        assertThat(context).isNotNull();
        assertThat(context.progressionStrategy()).isEqualTo(ProgressionStrategy.WEIGHT_FIRST);
        assertThat(context.currentWeek()).isEqualTo(1);
        assertThat(context.totalWeeks()).isEqualTo(4);
        assertThat(context.targetRpeMin()).isEqualTo(7.5);
        assertThat(context.targetRpeMax()).isEqualTo(8.5);
        assertThat(resolved.dto()).isNotNull();
        assertThat(resolved.dto().blockName()).isEqualTo("Block A");
    }

    @Test
    void returnsEmptyWhenNoActiveSplitExists() {
        when(splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.empty());

        assertThat(resolver.resolve(USER_ID)).isEqualTo(ActiveBlockContextResolver.ResolvedActiveBlockContext.empty());
    }
}
