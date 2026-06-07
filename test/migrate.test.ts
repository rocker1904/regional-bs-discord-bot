import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pendingMigrations} from '../src/migrate';

test('returns the .sql files not yet applied, in lexicographic order', () => {
    const available = ['0002_b.sql', '0001_a.sql', '0003_c.sql'];
    const applied = new Set(['0001_a.sql']);
    assert.deepEqual(pendingMigrations(available, applied), ['0002_b.sql', '0003_c.sql']);
});

test('ignores non-.sql entries', () => {
    const available = ['0001_a.sql', 'README.md', '.keep', 'notes.txt'];
    assert.deepEqual(pendingMigrations(available, new Set()), ['0001_a.sql']);
});

test('returns nothing when every migration is already applied', () => {
    const available = ['0001_a.sql', '0002_b.sql'];
    const applied = new Set(['0002_b.sql', '0001_a.sql']);
    assert.deepEqual(pendingMigrations(available, applied), []);
});
