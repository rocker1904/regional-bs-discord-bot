import {CommandInteraction, SlashCommandBuilder} from 'discord.js';
import {GuildUser} from '../entity/GuildUser';
import Strings from '../util/Strings';
import Command from './Command';
import ScoresaberAPI from 'scoresaber.js';
import logger from '../util/logger';

export default class AmCommand implements Command {
    public slashCommandBuilder = new SlashCommandBuilder()
        .setName('am')
        .setDescription('Returns the pp diff between you and the people around you.');

    public async execute(interaction: CommandInteraction) {
        // Fetch user from db
        const guildUser = await GuildUser.findOne({where: {discordID: interaction.user.id}});

        if (!guildUser) {
            await interaction.reply(Strings.NO_USER);
            return;
        }

        // Get data for profiles around the user
        const player = await ScoresaberAPI.fetchBasicPlayer(guildUser.scoreSaberID);
        const playerBelow = await ScoresaberAPI.fetchPlayerByRank(player.rank + 1).catch((err) => {
            logger.error('Am command failed. Error fetching playerBelow.');
            logger.error(err);
            void interaction.reply('Command failed. Error fetching data from ScoreSaber');
        });
        if (!playerBelow) return;

        if (player.rank === 1) {
            await interaction.reply(`You are ${(player.pp - playerBelow.pp).toFixed(2)}PP above ${playerBelow.name}`);
            return;
        }

        const playerAbove = await ScoresaberAPI.fetchPlayerByRank(player.rank - 1).catch((err) => {
            logger.error('Am command failed. Error fetching playerAbove.');
            logger.error(err);
            void interaction.reply('Command failed. Error fetching data from ScoreSaber');
        });
        if (!playerAbove) return;

        const reply = `__**Global ranks around you:**__
#${playerAbove.rank} **${playerAbove.name}** has ${(playerAbove.pp - player.pp).toFixed(2)} more PP than you.
#${player.rank} **You (${player.name})** have ${player.pp}PP.
#${playerBelow.rank} **${playerBelow.name}** has ${(player.pp - playerBelow.pp).toFixed(2)} less PP than you.`;

        await interaction.reply(reply);
    }
}
