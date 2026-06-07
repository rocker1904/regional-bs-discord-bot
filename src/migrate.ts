import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {Client} from 'pg';

/** The migration files in `available` not present in `applied`, in apply (lexicographic) order. */
export function pendingMigrations(available: string[], applied: Set<string>): string[] {
    return available.filter((name) => name.endsWith('.sql') && !applied.has(name)).sort();
}

// Plain .sql files live at the repo root (not compiled by tsc), so resolve them relative to
// this file: build/migrate.js -> ../migrations, and src/migrate.ts -> ../migrations under tsx.
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

/**
 * Apply every pending migration once, in order, each in its own transaction, recording it in
 * schema_migrations. Idempotent: re-running with nothing pending is a no-op. Exits non-zero on
 * failure so a deploy aborts before restarting the service.
 */
async function main(): Promise<void> {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    });
    await client.connect();
    try {
        await client.query(
            'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
        );
        const {rows} = await client.query<{name: string}>('SELECT name FROM schema_migrations');
        const applied = new Set(rows.map((r) => r.name));
        const available = existsSync(MIGRATIONS_DIR) ? readdirSync(MIGRATIONS_DIR) : [];
        const pending = pendingMigrations(available, applied);

        if (pending.length === 0) {
            console.log('Migrations up to date; nothing to apply.');
            return;
        }

        for (const name of pending) {
            const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
            console.log(`Applying migration ${name}...`);
            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw new Error(`Migration ${name} failed`, {cause: err});
            }
        }
        console.log(`Applied ${pending.length} migration(s).`);
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    main().catch((err: unknown) => {
        console.error(err);
        process.exit(1);
    });
}
