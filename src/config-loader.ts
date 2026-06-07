import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export interface ScoreFeedConfig {
    channelID: string;
    positionRequirement: number;
    allowUnrankedScores: boolean;
}

export interface GuildConfig {
    guildID: string;
    staffID: string;
    logChannelID: string;
    rankupFeedChannelID: string;
    scoreFeedConfig?: ScoreFeedConfig;
    regionRankGroups: RankGroup[]; // RankGroup is the ambient type from src/types/RankGroup.d.ts
    globalRankGroups: RankGroup[];
    scoreSaberRegions: string[];
    roleMap: Record<string, string>;
}

export interface Config {
    rankUpdateInterval: number;
    guildConfigs: GuildConfig[];
}

/** Thrown for any problem loading or validating the config — always with a field path. */
export class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigError';
    }
}

function describe(v: unknown): string {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
}

function fail(path: string, expected: string, value: unknown): never {
    throw new ConfigError(`config ${path || '(root)'}: expected ${expected}, got ${describe(value)}`);
}

function asObject(v: unknown, path: string): Record<string, unknown> {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(path, 'object', v);
    return v as Record<string, unknown>;
}
function asString(v: unknown, path: string): string {
    if (typeof v !== 'string') fail(path, 'string', v);
    return v;
}
function asNumber(v: unknown, path: string): number {
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'number', v);
    return v;
}
function asPositiveNumber(v: unknown, path: string): number {
    const n = asNumber(v, path);
    if (n <= 0) fail(path, 'positive number', v);
    return n;
}
function asBoolean(v: unknown, path: string): boolean {
    if (typeof v !== 'boolean') fail(path, 'boolean', v);
    return v;
}
function asArray(v: unknown, path: string): unknown[] {
    if (!Array.isArray(v)) fail(path, 'array', v);
    return v;
}
function optionalString(v: unknown, path: string, fallback: string): string {
    return v === undefined ? fallback : asString(v, path);
}

function parseRankGroup(v: unknown, path: string): RankGroup {
    const o = asObject(v, path);
    return {roleID: asString(o.roleID, `${path}.roleID`), rank: asNumber(o.rank, `${path}.rank`)};
}

function parseStringMap(v: unknown, path: string): Record<string, string> {
    const o = asObject(v, path);
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(o)) out[k] = asString(val, `${path}.${k}`);
    return out;
}

function parseScoreFeedConfig(v: unknown, path: string): ScoreFeedConfig {
    const o = asObject(v, path);
    return {
        channelID: asString(o.channelID, `${path}.channelID`),
        positionRequirement: asNumber(o.positionRequirement, `${path}.positionRequirement`),
        allowUnrankedScores: asBoolean(o.allowUnrankedScores, `${path}.allowUnrankedScores`),
    };
}

function parseGuildConfig(v: unknown, path: string): GuildConfig {
    const o = asObject(v, path);
    return {
        guildID: asString(o.guildID, `${path}.guildID`),
        staffID: asString(o.staffID, `${path}.staffID`),
        logChannelID: asString(o.logChannelID, `${path}.logChannelID`),
        rankupFeedChannelID: optionalString(o.rankupFeedChannelID, `${path}.rankupFeedChannelID`, ''),
        scoreFeedConfig: o.scoreFeedConfig === undefined ? undefined : parseScoreFeedConfig(o.scoreFeedConfig, `${path}.scoreFeedConfig`),
        regionRankGroups: asArray(o.regionRankGroups, `${path}.regionRankGroups`).map((g, i) =>
            parseRankGroup(g, `${path}.regionRankGroups[${i}]`),
        ),
        globalRankGroups: asArray(o.globalRankGroups, `${path}.globalRankGroups`).map((g, i) =>
            parseRankGroup(g, `${path}.globalRankGroups[${i}]`),
        ),
        scoreSaberRegions: asArray(o.scoreSaberRegions, `${path}.scoreSaberRegions`).map((r, i) =>
            asString(r, `${path}.scoreSaberRegions[${i}]`),
        ),
        roleMap: parseStringMap(o.roleMap, `${path}.roleMap`),
    };
}

function parseConfig(v: unknown): Config {
    const o = asObject(v, '');
    return {
        // Must be > 0: it becomes the role-updater's setInterval period, and 0 would busy-loop it.
        rankUpdateInterval: asPositiveNumber(o.rankUpdateInterval, 'rankUpdateInterval'),
        guildConfigs: asArray(o.guildConfigs, 'guildConfigs').map((g, i) => parseGuildConfig(g, `guildConfigs[${i}]`)),
    };
}

/** Read, parse and validate the config JSON at `path`. Throws `ConfigError` on any problem. */
export function loadConfig(path: string | undefined): Config {
    if (path === undefined || path === '') {
        throw new ConfigError('CONFIG_PATH is not set; point it at your guild config JSON file');
    }
    const resolved = resolve(path);
    let raw: string;
    try {
        raw = readFileSync(resolved, 'utf8');
    } catch (err) {
        throw new ConfigError(`could not read config file at ${resolved}: ${(err as Error).message}`);
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new ConfigError(`config file at ${resolved} is not valid JSON: ${(err as Error).message}`);
    }
    return parseConfig(parsed);
}
