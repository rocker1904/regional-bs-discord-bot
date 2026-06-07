import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatAccuracy, parseDifficulty} from '../src/util/formatScore';

test('formatAccuracy renders a 0-1 fraction as a 2dp percentage', () => {
    assert.equal(formatAccuracy(0), '0%');
    assert.equal(formatAccuracy(1), '100%');
    assert.equal(formatAccuracy(0.97057849905131), '97.06%');
    assert.equal(formatAccuracy(0.5), '50%');
});

test('parseDifficulty extracts and prettifies the label', () => {
    assert.equal(parseDifficulty('_ExpertPlus_SoloStandard'), 'Expert+');
    assert.equal(parseDifficulty('_Expert_SoloStandard'), 'Expert');
    assert.equal(parseDifficulty('_Easy_SoloStandard'), 'Easy');
});

test('parseDifficulty falls back to the raw value when it is not in the expected shape', () => {
    assert.equal(parseDifficulty('weird'), 'weird');
});
