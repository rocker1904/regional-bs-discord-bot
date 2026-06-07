import {loadConfig} from './config-loader';

export type {Config, GuildConfig, ScoreFeedConfig} from './config-loader';
export {ConfigError} from './config-loader';

/** The validated guild config, loaded once at boot from the CONFIG_PATH env var. */
export const config = loadConfig(process.env.CONFIG_PATH);
export const {guildConfigs, rankUpdateInterval} = config;
export default config;
