import {GuildApplicationCommandPermissionData} from 'discord.js';
import Bot from '../Bot';
import logger from './logger';
import commands from '../commands';

export default async function updatePermissions(): Promise<void> {
    const applicationCommands = await Bot.guild.commands.fetch();

    const fullPermissions: GuildApplicationCommandPermissionData[] = [];
    applicationCommands.forEach((applicationCommand) => {
        const command = commands.find((command) => command.slashCommandBuilder.name === applicationCommand.name);
        if (!command) {
            logger.error(`Command (${applicationCommand.name}) not found while updating permissions.`);
            return;
        }

        fullPermissions.push({
            id: applicationCommand.id,
            permissions: command.permissions,
        });
    });

    await Bot.guild.commands.permissions.set({fullPermissions});
    logger.info('Successfully updated command permissions.');
}
