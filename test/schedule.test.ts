import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextMonthlyRun, isDueThisMonth} from '../src/progress-report/schedule';

test('from mid-month, next run is the 1st of next month at noon (local)', () => {
    const now = new Date(2026, 0, 15, 9, 0, 0); // 15 Jan 2026 09:00 local
    const next = nextMonthlyRun(now);
    assert.equal(next.getFullYear(), 2026);
    assert.equal(next.getMonth(), 1); // February
    assert.equal(next.getDate(), 1);
    assert.equal(next.getHours(), 12);
    assert.equal(next.getMinutes(), 0);
});

test('on the 1st before noon, next run is today at noon', () => {
    const now = new Date(2026, 5, 1, 9, 0, 0);
    const next = nextMonthlyRun(now);
    assert.equal(next.getMonth(), 5);
    assert.equal(next.getDate(), 1);
    assert.equal(next.getHours(), 12);
});

test('on the 1st after noon, next run is the 1st of next month', () => {
    const now = new Date(2026, 5, 1, 13, 0, 0);
    const next = nextMonthlyRun(now);
    assert.equal(next.getMonth(), 6); // July
    assert.equal(next.getDate(), 1);
});

test('rolls over the year from December', () => {
    const now = new Date(2026, 11, 20, 0, 0, 0);
    const next = nextMonthlyRun(now);
    assert.equal(next.getFullYear(), 2027);
    assert.equal(next.getMonth(), 0);
});

test('isDueThisMonth: due when now is past this month-noon and lastRun is null or last month', () => {
    const now = new Date(2026, 5, 1, 12, 0, 0); // 1 Jun noon
    assert.equal(isDueThisMonth(now, null), true);
    assert.equal(isDueThisMonth(now, new Date(2026, 4, 1, 12, 0, 0)), true); // last run in May
    assert.equal(isDueThisMonth(now, new Date(2026, 5, 1, 12, 0, 0)), false); // already ran in June
    assert.equal(isDueThisMonth(new Date(2026, 5, 1, 11, 0, 0), null), false); // before noon on the 1st
});
