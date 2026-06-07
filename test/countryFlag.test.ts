import {test} from 'node:test';
import assert from 'node:assert/strict';
import countryFlag from '../src/util/countryFlag';

test('maps a 2-letter code to its flag emoji', () => {
    assert.equal(countryFlag('GB'), '🇬🇧');
    assert.equal(countryFlag('AU'), '🇦🇺');
});

test('is case-insensitive', () => {
    assert.equal(countryFlag('au'), '🇦🇺');
});

test('returns empty string for anything that is not a 2-letter code', () => {
    assert.equal(countryFlag('X'), '');
    assert.equal(countryFlag('GBR'), '');
    assert.equal(countryFlag('12'), '');
    assert.equal(countryFlag(''), '');
});
