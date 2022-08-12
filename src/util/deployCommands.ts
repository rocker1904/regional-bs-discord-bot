import {REST} from '@discordjs/rest';
import {Routes} from 'discord-api-types/v9';
import commands from '../commands';
import logger from './logger';
import {guildConfigs} from '../config.json';

export default async function deployCommands(): Promise<void> {
    if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
        logger.error('Deploy failed, missing environment variable(s).');
        return;
    }

    const slashCommands = commands.map((command) => command.slashCommandBuilder.toJSON());

    const rest = new REST({version: '9'}).setToken(process.env.BOT_TOKEN);

    // Clear guild commands
    for (const guildConfig of guildConfigs) {
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildConfig.guildID), {body: []})
            .then(() => logger.info(`Successfully cleared guild (${guildConfig.guildID}) application commands.`))
            .catch(logger.error);
    }

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {body: slashCommands})
        .then(() => logger.info('Successfully registered global application commands.'))
        .catch(logger.error);
}

// Excute if run separately
if (require.main === module) {
    void deployCommands();
}
