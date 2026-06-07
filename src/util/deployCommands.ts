import {REST} from '@discordjs/rest';
import {Routes} from 'discord-api-types/v9';
import commands from '../commands';
import contextMenuCommands from '../commands/contextMenu';
import logger from './logger';
import {guildConfigs} from '../config';

export default async function deployCommands(): Promise<void> {
    if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
        logger.error('Deploy failed, missing environment variable(s).');
        return;
    }

    const body = [
        ...commands.map((command) => command.slashCommandBuilder.toJSON()),
        ...contextMenuCommands.map((command) => command.builder.toJSON()),
    ];

    const rest = new REST({version: '9'}).setToken(process.env.BOT_TOKEN);

    // Clear guild commands
    for (const guildConfig of guildConfigs) {
        await rest
            .put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildConfig.guildID), {body: []})
            .then(() => logger.info(`Successfully cleared guild (${guildConfig.guildID}) application commands.`))
            .catch(logger.error);
    }

    await rest
        .put(Routes.applicationCommands(process.env.CLIENT_ID), {body})
        .then(() => logger.info('Successfully registered global application commands.'))
        .catch(logger.error);
}

// Excute if run separately
if (require.main === module) {
    void deployCommands();
}
