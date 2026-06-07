import {test} from 'node:test';
import assert from 'node:assert/strict';
import {statusLine} from '../src/progress-report/statusLine';

test('status line reflects enabled + last run', () => {
    const now = new Date(2026, 5, 15, 0, 0, 0);
    const s = statusLine(true, new Date(2026, 5, 1, 12, 0, 0), now);
    assert.match(s, /enabled/i);
    assert.match(s, /next/i);
});

test('status line reflects disabled and never-run', () => {
    const s = statusLine(false, null, new Date(2026, 5, 15));
    assert.match(s, /disabled/i);
    assert.match(s, /never/i);
});
