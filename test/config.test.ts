import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadConfig, ConfigError} from '../src/config-loader';

function writeConfig(contents: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'rbsbot-config-'));
    const p = join(dir, 'config.json');
    writeFileSync(p, contents);
    return p;
}

const valid = {
    rankUpdateInterval: 10,
    guildConfigs: [
        {
            guildID: '1',
            staffID: '2',
            logChannelID: '3',
            rankupFeedChannelID: '',
            scoreFeedConfig: {channelID: '4', positionRequirement: 10, allowUnrankedScores: false},
            regionRankGroups: [{roleID: 'r1', rank: 1}],
            globalRankGroups: [{roleID: 'g1', rank: 32}],
            scoreSaberRegions: ['gb'],
            roleMap: {gb: 'role-gb', '': 'role-default'},
        },
    ],
};

test('loads and types a valid config', () => {
    const cfg = loadConfig(writeConfig(JSON.stringify(valid)));
    assert.equal(cfg.rankUpdateInterval, 10);
    assert.equal(cfg.guildConfigs.length, 1);
    assert.equal(cfg.guildConfigs[0].scoreSaberRegions[0], 'gb');
    assert.equal(cfg.guildConfigs[0].scoreFeedConfig?.positionRequirement, 10);
});

test('CONFIG_PATH unset throws a clear ConfigError', () => {
    assert.throws(
        () => loadConfig(undefined),
        (e: unknown) => e instanceof ConfigError && /CONFIG_PATH/.test(e.message),
    );
});

test('a missing file throws a ConfigError naming the path', () => {
    assert.throws(
        () => loadConfig('/no/such/config.json'),
        (e: unknown) => e instanceof ConfigError && /no\/such\/config\.json/.test(e.message),
    );
});

test('invalid JSON throws a ConfigError', () => {
    assert.throws(
        () => loadConfig(writeConfig('{ not json')),
        (e: unknown) => e instanceof ConfigError && /valid JSON/.test(e.message),
    );
});

test('a schema violation names the offending field path', () => {
    const bad = structuredClone(valid) as Record<string, unknown>;
    delete (bad.guildConfigs as Record<string, unknown>[])[0].guildID;
    assert.throws(
        () => loadConfig(writeConfig(JSON.stringify(bad))),
        (e: unknown) => e instanceof ConfigError && /guildConfigs\[0\]\.guildID/.test(e.message),
    );
});

test('a wrong-typed field names the path and the expected type', () => {
    const bad = structuredClone(valid) as Record<string, unknown>;
    (bad as {rankUpdateInterval: unknown}).rankUpdateInterval = 'soon';
    assert.throws(
        () => loadConfig(writeConfig(JSON.stringify(bad))),
        (e: unknown) => e instanceof ConfigError && /rankUpdateInterval/.test(e.message) && /number/.test(e.message),
    );
});

test('a wrong-typed nested array field names the full path', () => {
    const bad = structuredClone(valid) as Record<string, unknown>;
    ((bad.guildConfigs as Record<string, unknown>[])[0].regionRankGroups as Record<string, unknown>[])[0].rank = 'first';
    assert.throws(
        () => loadConfig(writeConfig(JSON.stringify(bad))),
        (e: unknown) => e instanceof ConfigError && /guildConfigs\[0\]\.regionRankGroups\[0\]\.rank/.test(e.message),
    );
});

test('a non-string roleMap value names the offending key', () => {
    const bad = structuredClone(valid) as Record<string, unknown>;
    ((bad.guildConfigs as Record<string, unknown>[])[0].roleMap as Record<string, unknown>).gb = 123;
    assert.throws(
        () => loadConfig(writeConfig(JSON.stringify(bad))),
        (e: unknown) => e instanceof ConfigError && /guildConfigs\[0\]\.roleMap\.gb/.test(e.message) && /string/.test(e.message),
    );
});

test('rankUpdateInterval must be positive', () => {
    const bad = structuredClone(valid) as Record<string, unknown>;
    (bad as {rankUpdateInterval: unknown}).rankUpdateInterval = 0;
    assert.throws(
        () => loadConfig(writeConfig(JSON.stringify(bad))),
        (e: unknown) => e instanceof ConfigError && /rankUpdateInterval/.test(e.message) && /positive/.test(e.message),
    );
});

test('rankupFeedChannelID and scoreFeedConfig are optional', () => {
    const minimal = structuredClone(valid) as Record<string, unknown>;
    const g = (minimal.guildConfigs as Record<string, unknown>[])[0];
    delete g.rankupFeedChannelID;
    delete g.scoreFeedConfig;
    const cfg = loadConfig(writeConfig(JSON.stringify(minimal)));
    assert.equal(cfg.guildConfigs[0].rankupFeedChannelID, '');
    assert.equal(cfg.guildConfigs[0].scoreFeedConfig, undefined);
});

test('parses an optional progressReportConfig', () => {
    const withPr = structuredClone(valid) as Record<string, unknown>;
    (withPr.guildConfigs as Record<string, unknown>[])[0].progressReportConfig = {channelID: 'c', maxRegionRank: 100};
    const cfg = loadConfig(writeConfig(JSON.stringify(withPr)));
    assert.equal(cfg.guildConfigs[0].progressReportConfig?.channelID, 'c');
    assert.equal(cfg.guildConfigs[0].progressReportConfig?.maxRegionRank, 100);
});

test('progressReportConfig is optional (absent is fine)', () => {
    const cfg = loadConfig(writeConfig(JSON.stringify(valid)));
    assert.equal(cfg.guildConfigs[0].progressReportConfig, undefined);
});

test('progressReportConfig.maxRegionRank must be positive', () => {
    const bad = structuredClone(valid) as Record<string, unknown>;
    (bad.guildConfigs as Record<string, unknown>[])[0].progressReportConfig = {channelID: 'c', maxRegionRank: 0};
    assert.throws(
        () => loadConfig(writeConfig(JSON.stringify(bad))),
        (e: unknown) => e instanceof ConfigError && /progressReportConfig\.maxRegionRank/.test(e.message) && /positive/.test(e.message),
    );
});
