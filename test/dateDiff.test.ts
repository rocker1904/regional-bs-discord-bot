import {test} from 'node:test';
import assert from 'node:assert/strict';
import dateDiff from '../src/util/dateDiff';

const now = new Date('2026-06-07T12:00:00Z');

test('reports whole-day differences, rounding up', () => {
    assert.equal(dateDiff(new Date('2026-06-07T11:00:00Z'), now), '1 day'); // 1 hour
    assert.equal(dateDiff(new Date('2026-06-06T11:00:00Z'), now), '2 days'); // 25 hours
    assert.equal(dateDiff(new Date('2026-06-05T12:00:00Z'), now), '2 days'); // exactly 2 days
    assert.equal(dateDiff(new Date('2026-06-04T12:00:00Z'), now), '3 days'); // exactly 3 days
});

test('uses the absolute difference (order-independent)', () => {
    assert.equal(dateDiff(new Date('2026-06-09T12:00:00Z'), now), '2 days'); // 2 days ahead
});

test('defaults "now" to the current time', () => {
    assert.equal(dateDiff(new Date()), '1 day');
});
