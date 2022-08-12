import fs from 'fs';
import {ConnectionOptionsReader, DataSourceOptions, DataSource} from 'typeorm';
import Bot from './Bot';
import {GuildUser} from './entity/GuildUser';
import extractScoreSaberID from './util/extractScoreSaberID';
import logger from './util/logger';

type Mutable<Type> = {
    -readonly [Key in keyof Type]: Type[Key];
};

function printRow(row: {discordId: string, ssId: string}): void {
    console.log(`ScoreSaber ID: ${row.ssId}`);
    console.log(`Discord ID: ${row.discordId}`);
    return;
}

async function main() {
    console.log('Connecting to database...');
    const allDataSourceOptions = await new ConnectionOptionsReader().all();
    if (allDataSourceOptions.length === 0) {
        logger.error('Could not find database settings.');
        process.exit();
    }
    const dataSourceOptions = allDataSourceOptions[0] as Mutable<DataSourceOptions>;
    dataSourceOptions.extra = {socketPath: '/run/mysqld/mysqld.sock'};
    Bot.dataSource = new DataSource(dataSourceOptions);
    Bot.dataSource.initialize().catch((error) => {
        logger.error('Failed to connect to database');
        logger.error(error);
        process.exit();
    });
    console.log('Connected to database.');

    const name = '';
    const data = JSON.parse(fs.readFileSync(`${name}.json`).toString()) as {discordId: string, ssId: string}[];
    for (const row of data) {
        // Test if ScoreSaber ID is valid
        const scoreSaberID = extractScoreSaberID(row.ssId);
        if (scoreSaberID === null) {
            console.log('invalid scoresaber id');
            printRow(row);
            continue;
        }

        // Test if the user is already in the database
        if (await GuildUser.findOne({where: {discordID: row.discordId}})) {
            console.log('User already in the database');
            printRow(row);
            continue;
        }

        // Test if the ScoreSaber profile is already in the database
        if (await GuildUser.findOne({where: {scoreSaberID: scoreSaberID}})) {
            console.log('ScoreSaber already in the database');
            printRow(row);
            continue;
        }

        const guildUser = new GuildUser();
        guildUser.discordID = row.discordId;
        guildUser.scoreSaberID = scoreSaberID;
        await guildUser.save();
    }
}

void main();
