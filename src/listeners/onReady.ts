import Bot from '../Bot';
import logger from '../util/logger';
import updatePermissions from '../util/updatePermissions';

export default async function onReady(): Promise<void> {
    if (!process.env.GUILD_ID || !process.env.LOG_CHANNEL_ID) {
        // Log channel hasn't been initialised yet so can't use logger
        console.error('Missing guild ID or log channel ID');
        return;
    }
    Bot.guild = await Bot.client.guilds.fetch(process.env.GUILD_ID);
    const channel = await Bot.guild.channels.fetch(process.env.LOG_CHANNEL_ID);
    if (!channel || channel.type !== 'GUILD_TEXT') {
        console.error('Log channel doesn\'t exist or is not a text channel.');
        return;
    }
    Bot.logChannel = channel;

    if (!process.env.STAFF_ID) {
        logger.error('Staff ID missing from environment variables');
        return;
    }

    await Bot.guild.members.fetch(); // Get and cache server members
    logger.info(`Ready! Member Count: ${Bot.guild.members.cache.size}.`);

    await updatePermissions(); // Can't be run before the guild has been fetched
}
