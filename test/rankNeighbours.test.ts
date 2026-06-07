import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {PlayerCollection, PlayerListing} from 'scoresaber.js';
import rankNeighbours, {type PlayerLookup} from '../src/util/rankNeighbours';

const listing = (rank: number): PlayerListing =>
    ({id: `p${rank}`, name: `p${rank}`, stats: {rank, countryRank: rank}}) as unknown as PlayerListing;

// A fake ranking list of `total` players where rank N lives at position N.
const fakePlayers = (total: number): PlayerLookup => ({
    listPage: async (opts) => {
        const limit = opts.limit ?? 50;
        const page = opts.page ?? 1;
        const start = (page - 1) * limit;
        const data: PlayerListing[] = [];
        for (let i = 0; i < limit && start + i < total; i++) data.push(listing(start + i + 1));
        return {data, metadata: {page, itemsPerPage: limit, total}} as unknown as PlayerCollection;
    },
    atRank: async (rank) => {
        if (rank < 1 || rank > total) throw new RangeError('out of range');
        return listing(rank);
    },
});

test('mid-page: both neighbours come from the same page', async () => {
    const {above, below} = await rankNeighbours(25, {}, fakePlayers(100));
    assert.equal(above?.stats.rank, 24);
    assert.equal(below?.stats.rank, 26);
});

test('last on a page: below falls back to the next page via atRank', async () => {
    const {above, below} = await rankNeighbours(50, {}, fakePlayers(100));
    assert.equal(above?.stats.rank, 49);
    assert.equal(below?.stats.rank, 51);
});

test('first on a page: above falls back to the previous page via atRank', async () => {
    const {above, below} = await rankNeighbours(51, {}, fakePlayers(100));
    assert.equal(above?.stats.rank, 50);
    assert.equal(below?.stats.rank, 52);
});

test('rank 1: no player above', async () => {
    const {above, below} = await rankNeighbours(1, {}, fakePlayers(100));
    assert.equal(above, undefined);
    assert.equal(below?.stats.rank, 2);
});

test('last overall: no player below (atRank rejects, swallowed)', async () => {
    const {above, below} = await rankNeighbours(100, {}, fakePlayers(100));
    assert.equal(above?.stats.rank, 99);
    assert.equal(below, undefined);
});
