import fs from 'fs';
import Command from './Command';
import {GuildUser} from '../entity/GuildUser';
import extractScoreSaberID from '../util/extractScoreSaberID';
import {SlashCommandBuilder, CommandInteraction} from 'discord.js';

function printRow(row: {discordId: string, ssId: string}): void {
    console.log(`ScoreSaber ID: ${row.ssId}`);
    console.log(`Discord ID: ${row.discordId}`);
    return;
}

export default class ImportProfilesCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('import-profiles')
        .setDescription('Imports')
        .setDefaultMemberPermissions(0);

    public async execute(interaction: CommandInteraction) {
        const name = './bbsdFormatted.json';
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

        await interaction.reply('done');
    }
}
