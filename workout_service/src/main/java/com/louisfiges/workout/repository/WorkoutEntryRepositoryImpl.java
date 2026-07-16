package com.louisfiges.workout.repository;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.util.List;
import java.util.UUID;

public class WorkoutEntryRepositoryImpl implements WorkoutEntryStartupReadRepository {

    private static final String STARTUP_SUMMARY_SQL = """
            WITH ranked_entries AS (
                SELECT
                    we.id,
                    we.workout_template_id,
                    we.created_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY we.workout_template_id
                        ORDER BY we.created_at DESC, we.id DESC
                    ) AS row_num
                FROM workout_entries we
                WHERE we.user_id = :userId
                  AND we.workout_template_id IN (:templateIds)
            ),
            aggregate_entries AS (
                SELECT
                    we.workout_template_id AS workout_id,
                    COUNT(DISTINCT we.id) AS entry_count,
                    COALESCE(SUM(COALESCE(se.weight, 0) * se.reps), 0) AS total_weight_lifted
                FROM workout_entries we
                LEFT JOIN exercise_entries ee
                    ON ee.workout_entry_id = we.id
                LEFT JOIN set_entries se
                    ON se.exercise_entry_id = ee.id
                WHERE we.user_id = :userId
                  AND we.workout_template_id IN (:templateIds)
                GROUP BY we.workout_template_id
            )
            SELECT
                aggregate_entries.workout_id,
                aggregate_entries.entry_count,
                aggregate_entries.total_weight_lifted,
                ranked_entries.id AS latest_entry_id,
                ranked_entries.created_at AS latest_created_at
            FROM aggregate_entries
            LEFT JOIN ranked_entries
                ON ranked_entries.workout_template_id = aggregate_entries.workout_id
               AND ranked_entries.row_num = 1
            """;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public WorkoutEntryRepositoryImpl(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<WorkoutEntryStartupSummaryRow> summarizeForStartupByTemplateIds(UUID userId, List<UUID> templateIds) {
        if (templateIds == null || templateIds.isEmpty()) {
            return List.of();
        }

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("templateIds", templateIds);

        return jdbcTemplate.query(STARTUP_SUMMARY_SQL, parameters, (rs, rowNum) -> new WorkoutEntryStartupSummaryRow(
                rs.getObject("workout_id", UUID.class),
                rs.getLong("entry_count"),
                rs.getDouble("total_weight_lifted"),
                rs.getObject("latest_entry_id", UUID.class),
                rs.getTimestamp("latest_created_at") == null ? null : rs.getTimestamp("latest_created_at").toInstant()
        ));
    }
}
