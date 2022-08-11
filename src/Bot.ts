import {ConnectionOptionsReader, DataSource} from 'typeorm';
import 'reflect-metadata';
import {Client, Guild, IntentsBitField, TextChannel} from 'discord.js';
import deployCommands from './util/deployCommands';
import logger from './util/logger';
import onReady from './listeners/onReady';
import onInteraction from './listeners/onInteraction';
import RoleUpdater from './RoleUpdater';

export default class Bot {
    public static client: Client;
    public static guild: Guild;
    public static logChannel: TextChannel;
    public static dataSource: DataSource;
    public static updater: RoleUpdater;
}

async function main() {
    logger.info('Connecting to database...');
    const dataSourceOptions = await new ConnectionOptionsReader().all();
    if (dataSourceOptions.length === 0) {
        logger.error('Could not find database settings.');
        process.exit();
    }
    Bot.dataSource = new DataSource(dataSourceOptions[0]);
    Bot.dataSource.initialize().catch((error) => {
        logger.error('Failed to connect to database');
        logger.error(error);
        process.exit();
    });
    logger.info('Connected to database.');

    const intents = new IntentsBitField();
    intents.add(
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
    );

    Bot.client = new Client({intents});
    Bot.client.once('ready', onReady);
    Bot.client.on('interactionCreate', onInteraction);

    await deployCommands();
    await Bot.client.login(process.env.BOT_TOKEN); // Login errors not caught, we want to crash if we can't log in

    // Prevent the bot from crashing on uncaught errors
    process.on('unhandledRejection', (error) => logger.error('Uncaught Promise Rejection:', error));
}

void main();
