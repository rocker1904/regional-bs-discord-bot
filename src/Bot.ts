import {DataSource} from 'typeorm';
import 'reflect-metadata';
import {Client, Guild, IntentsBitField, TextChannel} from 'discord.js';
import deployCommands from './util/deployCommands';
import logger from './util/logger';
import onReady from './listeners/onReady';
import onInteraction from './listeners/onInteraction';
import RoleUpdater from './RoleUpdater';
import onGuildMemberAdd from './listeners/onGuildMemberAdd';
import ScoreFeed from './score-feed/ScoreFeed';
import {GuildUser} from './entity/GuildUser';
import {GainsCommandData} from './entity/GainsCommandData';
import {CounterData} from './entity/CounterData';

export default class Bot {
    public static client: Client;
    public static guilds: {[key: string]: Guild} = {}; // Guild ID -> Guild
    public static logChannels: {[key: string]: TextChannel} = {}; // Guild ID -> log Channel
    public static rankupFeedChannels: {[key: string]: TextChannel} = {}; // Guild ID -> rankup feed Channel
    public static scoreFeedChannels: {[key: string]: TextChannel} = {}; // Guild ID -> score feed Channel
    public static staffIDs: {[key: string]: string} = {}; // Guild ID -> staff ID
    public static dataSource: DataSource;
    public static roleUpdater: RoleUpdater;
    public static scoreFeed: ScoreFeed;
}

async function main() {
    logger.info('Connecting to database...');
    Bot.dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST ?? '127.0.0.1',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        entities: [GuildUser, GainsCommandData, CounterData],
        synchronize: false,
    });
    try {
        await Bot.dataSource.initialize();
        logger.info('Connected to database.');
    } catch (error) {
        logger.error('Failed to connect to database');
        logger.error(error);
        process.exit(1);
    }

    const intents = new IntentsBitField();
    intents.add(
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
    );

    Bot.client = new Client({intents});
    Bot.client.on('guildMemberAdd', (member) => void onGuildMemberAdd(member));
    Bot.client.on('interactionCreate', (interaction) => void onInteraction(interaction));
    Bot.client.once('ready', () => void onReady());

    await deployCommands();
    await Bot.client.login(process.env.BOT_TOKEN); // Login errors not caught, we want to crash if we can't log in

    // Prevent the bot from crashing on uncaught errors
    process.on('unhandledRejection', (error) => logger.error('Uncaught Promise Rejection:', error));
    process.on('uncaughtException', (error) => logger.error('Unhandled Exception:', error));
}

void main();
