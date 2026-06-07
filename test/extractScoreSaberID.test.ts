import {test} from 'node:test';
import assert from 'node:assert/strict';
import extractScoreSaberID from '../src/util/extractScoreSaberID';

test('returns a bare valid ID unchanged', () => {
    assert.equal(extractScoreSaberID('76561198166289091'), '76561198166289091');
    assert.equal(extractScoreSaberID('123456789012345'), '123456789012345'); // 15 digits
});

test('extracts the ID from a profile URL', () => {
    assert.equal(extractScoreSaberID('https://scoresaber.com/u/76561198166289091'), '76561198166289091');
});

test('trims query strings and trailing path segments', () => {
    assert.equal(extractScoreSaberID('https://scoresaber.com/u/76561198166289091?sort=top'), '76561198166289091');
    assert.equal(extractScoreSaberID('https://scoresaber.com/u/76561198166289091/scores'), '76561198166289091');
    assert.equal(extractScoreSaberID('https://scoresaber.com/u/76561198166289091&x=1'), '76561198166289091');
});

test('rejects invalid input', () => {
    assert.equal(extractScoreSaberID('not-an-id'), null);
    assert.equal(extractScoreSaberID(''), null);
    assert.equal(extractScoreSaberID('12345678901234'), null); // 14 digits, too short
    assert.equal(extractScoreSaberID('123456789012345678'), null); // 18 digits, too long
    assert.equal(extractScoreSaberID('https://scoresaber.com/u/123'), null); // valid URL, invalid ID
});
