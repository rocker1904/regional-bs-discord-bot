import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import renderPage from '../src/progress-report/renderPage';
import type {PlayerPage} from '../src/progress-report/groupIntoPages';
import type {PlayerListing} from 'scoresaber.js';

function player(name: string, countryRank: number): PlayerListing {
    return {name, stats: {countryRank, rank: countryRank * 10, totalPP: 1234.5}} as unknown as PlayerListing;
}

// A tiny valid PNG to stand in for an avatar.
async function tinyPng(): Promise<Buffer> {
    const c = createCanvas(4, 4);
    c.getContext('2d').fillRect(0, 0, 4, 4);
    return c.encode('png');
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

test('renders a page with an avatar buffer to a PNG', async () => {
    const avatar = await tinyPng();
    const page: PlayerPage = [
        {player: player('Alice', 1), color: '#ff0000'},
        {player: player('Bob', 2), color: '#00ff00'},
    ];
    const out = await renderPage(page, [avatar, avatar]);
    assert.ok(Buffer.isBuffer(out) && out.length > 0);
    assert.ok(out.subarray(0, 4).equals(PNG_MAGIC));
});

test('renders rows whose avatar is null (placeholder) without throwing', async () => {
    const page: PlayerPage = [{player: player('Carol', 3), color: '#0000ff'}];
    const out = await renderPage(page, [null]);
    assert.ok(out.subarray(0, 4).equals(PNG_MAGIC));
});
