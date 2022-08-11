import {SlashCommandBuilder} from '@discordjs/builders';
import {CommandInteraction} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Command from './Command';
import Strings from '../util/Strings';
import ScoresaberAPI from '../api/scoresaber';
import axios from 'axios';
import {Player} from '../api/scoresaber/types/PlayerData';

export default class OceRankCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('oce-rank')
        .setDescription('Returns the pp diff between you and the people around you on the oce leaderboard.');

    public async execute(interaction: CommandInteraction) {
        // Fetch user from db
        const guildUser = await GuildUser.findOne(interaction.user.id);

        if (!guildUser) {
            await interaction.reply(Strings.NO_USER);
            return;
        }

        // Get data for profiles around the user
        const player = await ScoresaberAPI.getPlayerByID(guildUser.scoreSaberID);
        if (player.country !== 'AU' && player.country !== 'NZ') {
            await interaction.reply('You\'re not from OCE.');
            return;
        }

        const resp = await axios.get('https://leaderboard-api.ocebs.com/rest/v1/player');
        const ocePlayers = resp.data as {scoresaberID: string, data: Player}[];
        ocePlayers.sort((a, b) => a.data.pp - b.data.pp);
        const idx = ocePlayers.findIndex((ocePlayer) => ocePlayer.scoresaberID === player.id);

        if (idx === -1) {
            await interaction.reply('Sorry, you\'re not high enough rank for this command to work, please complain to Byhemechi :)');
            return;
        }

        if (idx === 0) {
            const playerBelow = ocePlayers[1].data;
            await interaction.reply(`You are ${(player.pp - playerBelow.pp).toFixed(2)}PP above ${playerBelow.name}`);
            return;
        }

        const playerAbove = await ScoresaberAPI.getPlayerByRank(player.rank - 1);
        let reply = `__**Global ranks around you:**__
#${playerAbove.rank} **${playerAbove.name}** has ${(playerAbove.pp - player.pp).toFixed(2)} more PP than you.
#${player.rank} **You (${player.name})** have ${player.pp}PP.`;

        if (idx !== ocePlayers.length - 1) {
            const playerBelow = ocePlayers[1].data;
            reply += `\n#${playerBelow.rank} **${playerBelow.name}** has ${(player.pp - playerBelow.pp).toFixed(2)} less PP than you.`;
        }

        await interaction.reply(reply);
    }
}
