import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Command from './Command';
import Strings from '../util/Strings';
import ScoresaberAPI from 'scoresaber.js';
import Axios from 'axios';
import {Player} from 'scoresaber.js';
import logger from '../util/logger';
import axiosRetry from 'axios-retry';

axiosRetry(Axios, {
    retries: 3,
});

export default class OceRankCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('oce-rank')
        .setDescription('Returns the pp diff between you and the people around you on the oce leaderboard.');

    public async execute(interaction: CommandInteraction) {
        // May take time to get players so defer the reply
        await interaction.deferReply();

        // Fetch user from db
        const guildUser = await GuildUser.findOne({where: {discordID: interaction.user.id}});

        if (!guildUser) {
            await interaction.editReply(Strings.NO_USER);
            return;
        }

        // Get region of this player
        const player = await ScoresaberAPI.fetchBasicPlayer(guildUser.scoreSaberID).catch((err) => {
            logger.error('OCE rank command failed. Error fetching player.');
            logger.error(err);
            void interaction.reply('Command failed. Error fetching data from ScoreSaber');
        });
        if (!player) return;
        if (player.country !== 'AU' && player.country !== 'NZ') {
            await interaction.editReply('You\'re not from OCE.');
            return;
        }

        const resp = await Axios.get('https://leaderboard-api.ocebs.com/rest/v1/player');
        const ocePlayers = resp.data as {scoresaberID: string, data: Player}[];
        ocePlayers.sort((a, b) => b.data.pp - a.data.pp);
        const idx = ocePlayers.findIndex((ocePlayer) => ocePlayer.data.id === player.id);

        if (idx === -1) {
            await interaction.editReply('Sorry, you\'re not high enough rank for this command to work, please complain to Byhemechi :)');
            return;
        }

        if (idx === 0) {
            const playerBelow = ocePlayers[1].data;
            await interaction.editReply(`You are ${(ocePlayers[idx].data.pp - playerBelow.pp).toFixed(2)}PP above ${playerBelow.name}`);
            return;
        }

        const playerAbove = ocePlayers[idx - 1].data;
        let reply = `__**OCE ranks around you:**__
#${idx} **${playerAbove.name}** has ${(playerAbove.pp - ocePlayers[idx].data.pp).toFixed(2)} more PP than you.
#${idx + 1} **You (${player.name})** have ${ocePlayers[idx].data.pp}PP.`;

        if (idx !== ocePlayers.length - 1) {
            const playerBelow = ocePlayers[idx + 1].data;
            reply += `\n#${idx + 2} **${playerBelow.name}** has ${(ocePlayers[idx].data.pp - playerBelow.pp).toFixed(2)} less PP than you.`;
        }

        await interaction.editReply(reply);
    }
}
