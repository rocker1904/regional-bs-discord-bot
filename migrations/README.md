# Database migrations

Plain `.sql` files applied by the runner in `src/migrate.ts` (`npm run migrate`, also run by
`deploy.sh`). Each file is applied exactly once, tracked in a `schema_migrations` table, and
runs inside a single transaction. Re-running with nothing pending is a no-op.

## Writing a migration

Add a file named `NNNN_short_description.sql`:

- **Zero-padded, sequential number** (`0002_…`, `0003_…`). Files apply in lexicographic order,
  so keep the width consistent.
- **Append-only.** Don't edit or renumber a migration once it has been applied anywhere — write
  a new one. There are no down/rollback migrations.
- Prefer idempotent DDL (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) as a
  belt-and-suspenders measure, though the tracking table already prevents re-application.

## Constraints (because each file runs in one transaction)

- **No statements that can't run in a transaction** — e.g. `CREATE INDEX CONCURRENTLY`, or
  `ALTER TYPE … ADD VALUE` on Postgres < 12.
- **No `$1` placeholders** in the SQL. The file is sent via the simple query protocol (which is
  what lets a file contain multiple statements); parameterised queries aren't supported there.
