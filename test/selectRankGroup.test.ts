import {test} from 'node:test';
import assert from 'node:assert/strict';
import selectRankGroup from '../src/util/selectRankGroup';

const groups: RankGroup[] = [
    {roleID: 'top10', rank: 10},
    {roleID: 'top50', rank: 50},
    {roleID: 'top100', rank: 100},
];

test('picks the first bracket that covers the rank', () => {
    assert.equal(selectRankGroup(1, groups)?.roleID, 'top10');
    assert.equal(selectRankGroup(11, groups)?.roleID, 'top50');
    assert.equal(selectRankGroup(75, groups)?.roleID, 'top100');
});

test('treats the threshold as inclusive', () => {
    assert.equal(selectRankGroup(10, groups)?.roleID, 'top10');
    assert.equal(selectRankGroup(50, groups)?.roleID, 'top50');
    assert.equal(selectRankGroup(100, groups)?.roleID, 'top100');
});

test('returns undefined beyond every bracket', () => {
    assert.equal(selectRankGroup(101, groups), undefined);
});

test('returns undefined for an empty bracket list', () => {
    assert.equal(selectRankGroup(1, []), undefined);
});
