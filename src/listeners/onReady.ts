import {ChannelType} from 'discord.js';
import Bot from '../Bot';
import RoleUpdater from '../RoleUpdater';
import logger from '../util/logger';
import config from '../config.json';
import ProgressReport from '../ProgressReport';

export default async function onReady(): Promise<void> {
    for (const guildConfig of config.guildConfigs) {
        const guild = await Bot.client.guilds.fetch(guildConfig.guildID);
        if (!guild) {
            console.error(`Couldn't fetch guild ${guildConfig.guildID}.`);
            return;
        }
        Bot.guilds[guildConfig.guildID] = guild;

        const logChannel = await guild.channels.fetch(guildConfig.logChannelID);
        if (!logChannel || logChannel.type !== ChannelType.GuildText) {
            console.error(`Log channel doesn\'t exist or is not a text channel for guild ${guild.name}.`);
            return;
        }
        Bot.logChannels[guildConfig.guildID] = logChannel;

        if (guildConfig.rankupFeedChannelID) {
            const rankupFeedChannel = await guild.channels.fetch(guildConfig.rankupFeedChannelID as string);
            if (!rankupFeedChannel || rankupFeedChannel.type !== ChannelType.GuildText) {
                console.error(`Rankup feed channel doesn\'t exist or is not a text channel for guild ${guild.name}.`);
                return;
            }
            Bot.rankupFeedChannels[guildConfig.guildID] = rankupFeedChannel;
        }

        if (guildConfig.progressReportChannelID) {
            const progressReportChannel = await guild.channels.fetch(guildConfig.progressReportChannelID as string);
            if (!progressReportChannel || progressReportChannel.type !== ChannelType.GuildText) {
                console.error(`Progress report channel doesn\'t exist or is not a text channel for guild ${guild.name}.`);
                return;
            }
            Bot.progressReportChannels[guildConfig.guildID] = progressReportChannel;
        }

        Bot.staffIDs[guildConfig.guildID] = guildConfig.staffID; // Todo: Validation of role

        await guild.members.fetch(); // Get and cache server members
        logger.info(`${guild.name} set up! Member count: ${guild.members.cache.size}.`);
    }

    Bot.updater = new RoleUpdater();
    Bot.progressReport = new ProgressReport();

    logger.info(`Ready! User count: ${Bot.client.users.cache.size}.`);
}
