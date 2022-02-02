import {Connection, createConnection} from 'typeorm';
import 'reflect-metadata';
import {Client, Guild, Intents, TextChannel} from 'discord.js';
import deployCommands from './util/deployCommands';
import logger from './util/logger';
import onReady from './listeners/onReady';
import onInteraction from './listeners/onInteraction';
import RoleUpdater from './RoleUpdater';

export default class Bot {
    public static client: Client;
    public static guild: Guild;
    public static logChannel: TextChannel;
    public static dbConnection: Connection;
    public static updater: RoleUpdater;
}

async function main() {
    logger.info('Connecting to database...');
    Bot.dbConnection = await createConnection().catch((error) => {
        logger.error('Failed to connect to database');
        logger.error(error);
        process.exit();
    });
    logger.info('Connected to database.');

    const intents = new Intents();
    intents.add(
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
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
