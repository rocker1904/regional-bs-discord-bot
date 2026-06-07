import {test} from 'node:test';
import assert from 'node:assert/strict';
import groupIntoPages, {type RankTier} from '../src/progress-report/groupIntoPages';
import type {PlayerListing} from 'scoresaber.js';

// Minimal player stand-in: only the field groupIntoPages reads.
function p(countryRank: number): PlayerListing {
    return {stats: {countryRank}} as unknown as PlayerListing;
}
const tiers: RankTier[] = [
    {rank: 1, color: '#aaa'},
    {rank: 10, color: '#bbb'},
    {rank: 25, color: '#ccc'},
];

test('returns no pages for no players', () => {
    assert.deepEqual(groupIntoPages([], tiers), []);
});

test('a short single tier becomes one page (final partial page is kept)', () => {
    const players = [p(1), p(2), p(3)];
    const pages = groupIntoPages(players, tiers);
    assert.equal(pages.length, 1);
    assert.equal(pages[0].length, 3);
});

test('splits on a tier boundary once the page has at least the minimum', () => {
    // 12 players: ranks 1..12. Boundary at rank 10. min page size is 10.
    const players = Array.from({length: 12}, (_, i) => p(i + 1));
    const pages = groupIntoPages(players, tiers);
    assert.equal(pages.length, 2);
    assert.ok(pages[0].length >= 10);
    assert.equal(pages[0].length + pages[1].length, 12);
});

test('caps a page at the maximum size', () => {
    // 30 players all in the first tier region (no boundary crossed until rank 25).
    const players = Array.from({length: 30}, (_, i) => p(i + 1));
    const pages = groupIntoPages(players, tiers);
    assert.ok(pages.every((pg) => pg.length <= 25));
    assert.equal(
        pages.reduce((n, pg) => n + pg.length, 0),
        30,
    );
});

test('does not index past the last tier (no crash) and colours rows', () => {
    const players = Array.from({length: 40}, (_, i) => p(i + 1)); // ranks beyond last tier rank 25
    const pages = groupIntoPages(players, tiers);
    assert.ok(pages.length >= 1);
    for (const pg of pages) for (const row of pg) assert.ok(tiers.some((t) => t.color === row.color));
});
