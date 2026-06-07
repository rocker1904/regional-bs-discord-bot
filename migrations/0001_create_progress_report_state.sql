-- Per-guild progress-report state (see src/entity/ProgressReportState.ts).
-- Absence of a row, or enabled=false, means the monthly report does not fire for that guild.
CREATE TABLE IF NOT EXISTS progress_report_state (
    guild_id    varchar PRIMARY KEY,
    enabled     boolean NOT NULL,
    last_run_at timestamptz NULL
);
