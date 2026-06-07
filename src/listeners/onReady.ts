import {ChannelType} from 'discord.js';
import Bot from '../Bot';
import RoleUpdater from '../RoleUpdater';
import logger from '../util/logger';
import config from '../config';
import ScoreFeed from '../score-feed/ScoreFeed';
import ProgressReport from '../progress-report/ProgressReport';

export default async function onReady(): Promise<void> {
    for (const guildConfig of config.guildConfigs) {
        const guild = await Bot.client.guilds.fetch(guildConfig.guildID);
        if (!guild) {
            logger.error(`Couldn't fetch guild ${guildConfig.guildID}.`);
            continue;
        }
        Bot.guilds[guildConfig.guildID] = guild;

        const logChannel = await guild.channels.fetch(guildConfig.logChannelID);
        if (!logChannel || logChannel.type !== ChannelType.GuildText) {
            logger.error(`Log channel doesn't exist or is not a text channel for guild ${guild.name}.`);
            continue;
        }
        Bot.logChannels[guildConfig.guildID] = logChannel;

        if (guildConfig.rankupFeedChannelID) {
            const rankupFeedChannel = await guild.channels.fetch(guildConfig.rankupFeedChannelID);
            if (!rankupFeedChannel || rankupFeedChannel.type !== ChannelType.GuildText) {
                logger.error(`Rankup channel doesn't exist or is not a text channel for guild ${guild.name}.`);
                continue;
            }
            Bot.rankupFeedChannels[guildConfig.guildID] = rankupFeedChannel;
        }

        if (guildConfig.scoreFeedConfig?.channelID) {
            const scoreFeedChannel = await guild.channels.fetch(guildConfig.scoreFeedConfig?.channelID);
            if (!scoreFeedChannel || scoreFeedChannel.type !== ChannelType.GuildText) {
                logger.error(`Score feed channel doesn't exist or is not a text channel for guild ${guild.name}.`);
                continue;
            }
            Bot.scoreFeedChannels[guildConfig.guildID] = scoreFeedChannel;
        }

        if (guildConfig.progressReportConfig?.channelID) {
            const progressReportChannel = await guild.channels.fetch(guildConfig.progressReportConfig.channelID);
            if (!progressReportChannel || progressReportChannel.type !== ChannelType.GuildText) {
                logger.error(`Progress report channel doesn't exist or is not a text channel for guild ${guild.name}.`);
                continue;
            }
            Bot.progressReportChannels[guildConfig.guildID] = progressReportChannel;
        }

        Bot.staffIDs[guildConfig.guildID] = guildConfig.staffID; // Todo: Validation of role

        // Members are fetched/cached by RoleUpdater on its first run (constructed below).
        logger.info(`${guild.name} set up!`);
    }

    if (Object.keys(Bot.guilds).length === 0) {
        logger.error('No guilds were initialised — check the guild/channel IDs in your CONFIG_PATH file.');
    }

    Bot.roleUpdater = new RoleUpdater();
    Bot.scoreFeed = new ScoreFeed();
    Bot.progressReport = new ProgressReport();
    Bot.progressReport.start();

    logger.info(`Ready! User count: ${Bot.client.users.cache.size}.`);
}
